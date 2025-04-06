const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables (make sure your API key is in .env)
dotenv.config({ path: './config/.env' });

// Initialize the GoogleGenerativeAI with your API key
if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set in the environment variables. GeminiService will not function.');
}
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * Fetches plausible volunteer opportunities based on a source context (like HandsOn San Diego)
 * using the Gemini API, formatting them for the database.
 * 
 * @param {string} contextDescription Description of the source (e.g., "HandsOn San Diego").
 * @param {string} location General location focus (e.g., "San Diego, CA").
 * @param {string[]} [categories=[]] Optional array of categories to filter by.
 * @param {number} [limit=5] The maximum number of opportunities to generate.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of opportunity objects.
 */
async function fetchVolunteerOpportunities(contextDescription, location, categories = [], limit = 5) {
  if (!genAI) {
    console.error('Gemini API key not configured. Cannot fetch opportunities.');
    return [];
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let categoryInstructions = '';
  if (categories.length > 0) {
    categoryInstructions = `Focus on opportunities in these categories: ${categories.join(', ')}.`;
  }

  // --- Updated Prompt --- 
  const prompt = `
    Generate ${limit} plausible volunteer opportunities typical for an organization like ${contextDescription} operating in ${location}. 
    ${categoryInstructions}
    Base the opportunities on common volunteer activities found in that area (e.g., food banks, beach cleanups, tutoring, animal shelters, community events).
    
    For each opportunity, provide ONLY the following details in the specified format:
    - title: (String) A realistic title for the opportunity.
    - organization: (String) A plausible organization name (can be fictional or real if appropriate).
    - description: (String) A brief summary (50-100 words) describing the tasks.
    - location: (String) A specific-sounding street address or landmark within ${location}.
    - dateTime: (String) A realistic future date and time in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ).
    - duration: (Number) Estimated duration in hours (numeric only, e.g., 3).
    - tag: (String) Primary category. Choose ONE from: healthcare, education, environment, community, animals, government, other.
    - coordinates: (Object) Geographic coordinates within ${location} with 'lat' and 'lng' properties (e.g., { "lat": 32.7157, "lng": -117.1611 } for San Diego).

    IMPORTANT: Format the entire response as a single, valid JSON array of objects. Do not include any text before or after the JSON array. Ensure all strings are properly escaped.
    Example JSON structure for a single opportunity:
    {
      "title": "Beach Cleanup at Mission Beach",
      "organization": "Surfrider Foundation - San Diego Chapter",
      "description": "Help keep our beaches clean! Join us to remove trash and debris from Mission Beach.",
      "location": "Mission Beach Boardwalk near Belmont Park, San Diego, CA",
      "dateTime": "2024-09-15T09:00:00Z",
      "duration": 2,
      "tag": "environment",
      "coordinates": { "lat": 32.7714, "lng": -117.2523 }
    }
  `;

  console.log(`Sending prompt to Gemini for ${contextDescription} opportunities in ${location}...`);

  // ... (Rest of the API call and JSON parsing logic remains the same) ...
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the JSON response directly
    try {
      const opportunities = JSON.parse(text);
      if (!Array.isArray(opportunities)) {
        console.error('Gemini response was not a JSON array:', text);
        return [];
      }
      console.log(`Received ${opportunities.length} opportunities from Gemini.`);
      return opportunities;
    } catch (parseError) {
      console.warn('Direct JSON parsing failed, attempting to extract from markdown...');
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\n?[\s\S]*?\])/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const extractedJson = jsonMatch[1].trim();
          const opportunities = JSON.parse(extractedJson);
          if (!Array.isArray(opportunities)) {
             console.error('Extracted content was not a JSON array:', extractedJson);
             return [];
           }
          console.log(`Extracted and parsed ${opportunities.length} opportunities.`);
          return opportunities;
        } catch (nestedParseError) {
          console.error('Error parsing extracted JSON from Gemini response:', nestedParseError);
          console.error('Original Gemini text:', text);
          return [];
        }
      } else {
        console.error('Could not extract JSON from Gemini response using regex.');
        console.error('Original Gemini text:', text);
        return [];
      }
    }
  } catch (error) {
    console.error('Error fetching opportunities from Gemini API:', error);
    return [];
  }
}

module.exports = { fetchVolunteerOpportunities };
