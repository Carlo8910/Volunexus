const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db'); // Assuming connectDB is in config
const Opportunity = require('../models/Opportunity');
const { fetchVolunteerOpportunities } = require('../services/geminiService');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config/.env') });

// --- Configuration ---
const CONTEXT_DESCRIPTION = "HandsOn San Diego"; // Source context
const LOCATION_FOCUS = "San Diego, CA"; // Area to generate for
const TOTAL_OPPORTUNITIES_TO_FETCH = 20; // Total desired opportunities
const FETCH_BATCH_SIZE = 5; // How many to ask Gemini for at a time
const CATEGORIES = ['education', 'environment', 'community', 'animals', 'healthcare']; // Optional: Filter by these
// IMPORTANT: Replace with a valid User ObjectId from your DB, or set to null
const DEFAULT_USER_ID = '60d5ecf13a5f7d4e5c7b6a3e';
// --------------------

/**
 * Main function to populate the database with opportunities fetched from Gemini.
 */
async function populateDatabase() {
  console.log('Starting database population script...');

  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI not found in environment variables.');
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.warn('Warning: GEMINI_API_KEY not set. Cannot fetch from Gemini.');
    // process.exit(1); // Optionally exit if Gemini is essential
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('MongoDB Connected.');

    let totalFetched = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    let cumulativeFetchedOpportunities = [];

    console.log(`\n--- Fetching opportunities for ${CONTEXT_DESCRIPTION} in ${LOCATION_FOCUS} ---`);
    // Fetch in batches until we reach the total desired
    while (cumulativeFetchedOpportunities.length < TOTAL_OPPORTUNITIES_TO_FETCH) {
        const needed = TOTAL_OPPORTUNITIES_TO_FETCH - cumulativeFetchedOpportunities.length;
        const limit = Math.min(needed, FETCH_BATCH_SIZE); // Ask for a batch size or fewer if close to total

        console.log(`Fetching batch of ${limit} opportunities...`);
        const batch = await fetchVolunteerOpportunities(CONTEXT_DESCRIPTION, LOCATION_FOCUS, CATEGORIES, limit);
        totalFetched += batch.length;
        cumulativeFetchedOpportunities = cumulativeFetchedOpportunities.concat(batch);

        if (batch.length < limit) {
            console.log("Gemini returned fewer opportunities than requested, stopping fetch.");
            break; // Stop if Gemini returns fewer than asked, might be out of ideas
        }
        // Optional: Add a small delay between API calls if needed
        // await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\nProcessing ${cumulativeFetchedOpportunities.length} fetched opportunities...`);

    // Process and insert each opportunity
    for (const oppData of cumulativeFetchedOpportunities) {
      // Basic validation of fetched data
      if (!oppData.title || !oppData.location || !oppData.coordinates || typeof oppData.coordinates.lat !== 'number' || typeof oppData.coordinates.lng !== 'number') {
        console.warn(`Skipping opportunity due to missing/invalid essential data (title, location, coordinates): ${oppData.title || '(No Title)'} `);
        totalSkipped++;
        continue;
      }

      // Check if an opportunity with the same title and location address already exists
      const existingOpp = await Opportunity.findOne({ title: oppData.title, "location.address": oppData.location });
      if (existingOpp) {
        console.log(`Skipping duplicate opportunity: ${oppData.title} at ${oppData.location}`);
        totalSkipped++;
        continue;
      }

      // Prepare the document for insertion, formatting location correctly
      const opportunityToInsert = {
        title: oppData.title,
        description: oppData.description || 'No description provided.', // Add default
        location: {
          address: oppData.location, // Use the string location as address
          coordinates: {
            type: 'Point',
            // IMPORTANT: Mongoose/MongoDB expect [longitude, latitude]
            coordinates: [parseFloat(oppData.coordinates.lng), parseFloat(oppData.coordinates.lat)]
          }
        },
        dateTime: oppData.dateTime ? new Date(oppData.dateTime) : new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Default to random future date if missing
        duration: typeof oppData.duration === 'number' ? oppData.duration : Math.floor(Math.random() * 3) + 1, // Default random duration 1-3 hours
        tag: oppData.tag || 'other', // Default tag
        // Use DEFAULT_USER_ID if it's a valid ObjectId, otherwise null
        createdBy: DEFAULT_USER_ID && mongoose.Types.ObjectId.isValid(DEFAULT_USER_ID) ? new mongoose.Types.ObjectId(DEFAULT_USER_ID) : null,
        attendees: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        await Opportunity.create(opportunityToInsert);
        console.log(`  [+] Created: ${oppData.title}`);
        totalCreated++;
      } catch (creationError) {
        console.error(`  [-] Error creating opportunity "${oppData.title}":`, creationError.message);
        // Log the validation errors specifically if they occur
        if (creationError instanceof mongoose.Error.ValidationError) {
            console.error('Validation Errors:', creationError.errors);
        }
        totalSkipped++;
      }
    }

    console.log('\n--- Population Summary ---');
    console.log(`Total opportunities fetched from Gemini: ${totalFetched}`);
    console.log(`Total opportunities successfully created: ${totalCreated}`);
    console.log(`Total opportunities skipped (duplicates/errors/invalid): ${totalSkipped}`);
    console.log('Database population script finished.');

  } catch (error) {
    console.error('\n*** An error occurred during database population: ***', error);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

// Run the population script
populateDatabase();