// Map initialization
let map;
let infoWindow;
let allOpportunityData = []; // Store all opportunities fetched from server
let visibleMarkers = []; // Store currently visible markers
let currentLocationMarker;

/**
 * Initializes the Google Map, adds markers, and sets up filters.
 */
function initMap() {
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    console.error('Google Maps API is not loaded.');
    document.getElementById('map').innerHTML = '<p class="text-red-500 text-center">Map could not be loaded. Ensure Google Maps API is included.</p>';
    return;
  }

  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 32.7157, lng: -117.1611 }, // Default center (e.g., San Diego)
    zoom: 11, // Zoom out slightly to see more area
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true
  });

  infoWindow = new google.maps.InfoWindow();

  // --- Get Opportunity Data --- 
  const opportunitiesContainer = document.getElementById('map-data');
  if (opportunitiesContainer && opportunitiesContainer.textContent) {
    try {
      allOpportunityData = JSON.parse(opportunitiesContainer.textContent);
      console.log(`Loaded ${allOpportunityData.length} opportunities for map.`);
    } catch (e) {
      console.error('Error parsing opportunity data from template:', e);
      allOpportunityData = [];
    }
  } else {
    console.warn('Map data container not found or empty.');
  }

  // --- Setup UI --- 
  setupFilters();
  setupAddressSearch(); // If keeping address search
  attemptUserGeolocation(); // Try to center on user
  
  // --- Initial Display --- 
  displayOpportunities(); // Display initially loaded opportunities
}

/**
 * Google Maps API callback function.
 * This is what Google will call when the API is loaded.
 */
window.initMapOnLoad = function() {
  console.log('Google Maps API loaded, initializing map via callback');
  if (document.getElementById('map')) {
    initMap();
  } else {
    console.log('Map element not found, may be on a different page');
  }
};

// Also expose initMap globally in case it's needed directly
window.initMap = initMap;

/**
 * Clears existing markers and adds new ones based on current filters.
 */
function displayOpportunities() {
  clearMarkers(); // Clear existing markers from map

  const searchTerm = document.getElementById('search-term')?.value.toLowerCase() || '';

  const filteredOpportunities = allOpportunityData.filter(opp => {
    // Basic coordinate check
    if (!opp.coordinates || typeof opp.coordinates.lat !== 'number' || typeof opp.coordinates.lng !== 'number') {
        return false;
    }
    
    // Check if opportunity matches search term
    const matchesSearch = !searchTerm || 
                         (opp.title && opp.title.toLowerCase().includes(searchTerm)) || 
                         (opp.description && opp.description.toLowerCase().includes(searchTerm)) ||
                         (opp.location && opp.location.toLowerCase().includes(searchTerm)) ||
                         (opp.tag && opp.tag.toLowerCase().includes(searchTerm)); // Search tag name also

    return matchesSearch;
  });

  console.log(`Displaying ${filteredOpportunities.length} filtered opportunities.`);

  // Add markers for filtered opportunities
  filteredOpportunities.forEach(addMarkerForOpportunity);
}

/**
 * Adds a single marker to the map for a given opportunity.
 * @param {object} opportunity - The opportunity data object.
 */
function addMarkerForOpportunity(opportunity) {
  // Standard check
  if (!opportunity.coordinates) {
    console.warn('Skipping marker for opportunity with missing coordinates:', opportunity.title);
    return; 
  }
  
  const position = { 
    lat: opportunity.coordinates.lat,
    lng: opportunity.coordinates.lng
  };

  // Standard check
  if (typeof position.lat !== 'number' || typeof position.lng !== 'number' || isNaN(position.lat) || isNaN(position.lng)) {
     console.error('Invalid lat/lng values for marker:', position, 'Opportunity:', opportunity.title);
     return; 
  }

  // Use category color for marker if available
  const markerColor = getCategoryColor(opportunity.tag); 

  const marker = new google.maps.Marker({
    position,
    map,
    title: opportunity.title,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 9, 
      fillColor: markerColor,
      fillOpacity: 0.9,
      strokeColor: '#ffffff',
      strokeWeight: 1.5
    },
    // Store data within the marker for easy access
    opportunityData: opportunity 
  });

  marker.addListener('click', () => {
    showInfoWindow(marker);
  });

  visibleMarkers.push(marker);
}

/**
 * Shows the InfoWindow for a clicked marker.
 * @param {google.maps.Marker} marker - The clicked marker instance.
 */
function showInfoWindow(marker) {
  const opportunity = marker.opportunityData; // Retrieve data stored in marker
  if (!opportunity) return;

  const date = new Date(opportunity.dateTime);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const content = `
    <div style="max-width: 280px; padding: 8px; color: #333; font-family: Arial, sans-serif;">
      <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #000; font-size: 16px;">${opportunity.title}</h3>
      <p style="margin: 2px 0; font-size: 0.85em; color: #555;">
        <i class="fas fa-calendar-alt fa-fw" style="color: #888;"></i> ${formattedDate} at ${formattedTime}
      </p>
      <p style="margin: 2px 0; font-size: 0.85em; color: #555;">
        <i class="fas fa-map-marker-alt fa-fw" style="color: #888;"></i> ${opportunity.location || 'Location TBD'}
      </p>
      <p style="margin: 2px 0; font-size: 0.85em; color: #555;">
        <i class="fas fa-clock fa-fw" style="color: #888;"></i> ${opportunity.duration || 0} hours
      </p>
      ${opportunity.description ? `<p style="margin: 8px 0; font-size: 0.9em; color: #333;">${opportunity.description.substring(0, 100)}${opportunity.description.length > 100 ? '...' : ''}</p>` : ''}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
        <span style="font-size: 0.75em; background-color: #e0e0e0; color: #333; padding: 2px 6px; border-radius: 10px; text-transform: capitalize;">${opportunity.tag}</span>
        <div>
          <a href="/opportunities/${opportunity._id}" style="display: inline-block; margin-left: 5px; padding: 4px 8px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: bold;">View Quest</a>
          <a href="/opportunities/${opportunity._id}/signup" style="display: inline-block; margin-left: 5px; padding: 4px 8px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: bold;">Join Quest</a>
        </div>
      </div>
    </div>
  `;

  infoWindow.setContent(content);
  infoWindow.open(map, marker);
  
  // Also display details in the bottom details section
  const detailsContainer = document.getElementById('opportunity-details');
  if (detailsContainer) {
    detailsContainer.innerHTML = `
      <div class="flex flex-col md:flex-row items-start gap-4">
        <div class="flex-1">
          <div class="flex items-center mb-2">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-${getCategoryClass(opportunity.tag)}-900 border border-${getCategoryClass(opportunity.tag)}-700 mr-3">
              <i class="${getCategoryIcon(opportunity.tag)} text-${getCategoryClass(opportunity.tag)}-400"></i>
            </div>
            <h3 class="text-xl font-bold text-blue-300">${opportunity.title}</h3>
          </div>
          <p class="text-gray-300 mb-3">${opportunity.description}</p>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="bg-gray-700 p-2 rounded">
              <div class="text-xs text-blue-300 uppercase">Date & Time</div>
              <div class="text-white">${formattedDate} at ${formattedTime}</div>
            </div>
            <div class="bg-gray-700 p-2 rounded">
              <div class="text-xs text-blue-300 uppercase">Location</div>
              <div class="text-white">${opportunity.location || 'Location TBD'}</div>
            </div>
            <div class="bg-gray-700 p-2 rounded">
              <div class="text-xs text-blue-300 uppercase">Duration</div>
              <div class="text-white">${opportunity.duration || 0} hours</div>
            </div>
            <div class="bg-gray-700 p-2 rounded">
              <div class="text-xs text-blue-300 uppercase">Category</div>
              <div class="text-white">${opportunity.tag}</div>
            </div>
          </div>
        </div>
        <div class="w-full md:w-auto flex flex-col gap-2">
          <a href="/opportunities/${opportunity._id}" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center whitespace-nowrap">
            <i class="fas fa-info-circle mr-2"></i> View Quest Details
          </a>
          <a href="/opportunities/${opportunity._id}/signup" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center whitespace-nowrap">
            <i class="fas fa-user-plus mr-2"></i> Join This Quest
          </a>
        </div>
      </div>
    `;
    detailsContainer.classList.remove('hidden');
  }
}

/**
 * Clears all markers currently shown on the map.
 */
function clearMarkers() {
  visibleMarkers.forEach(marker => marker.setMap(null));
  visibleMarkers = [];
}

/**
 * Sets up event listeners for filter controls.
 */
function setupFilters() {
  const searchTermInput = document.getElementById('search-term');

  if (searchTermInput) {
    // Use 'input' event for real-time filtering as user types
    searchTermInput.addEventListener('input', displayOpportunities); 
  }
}

/**
 * Sets up Google Places Autocomplete for address search input AND
 * adds a click listener for a separate search button.
 */
function setupAddressSearch() {
  const addressInput = document.getElementById('address-search-input');
  const searchButton = document.getElementById('address-search-button'); // Assume button has this ID

  if (!addressInput || !google.maps.places) {
      console.warn('Address search input or Places library not found.');
      // Don't return entirely, maybe the button exists
  }

  // --- Autocomplete Setup --- 
  if (addressInput) {
    const autocomplete = new google.maps.places.Autocomplete(addressInput, {
        fields: ["geometry", "name"],
        types: ['geocode']
    });

    autocomplete.bindTo('bounds', map);

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
            map.setCenter(place.geometry.location);
            map.setZoom(14);
        } else {
            console.log("Autocomplete returned place with no geometry");
        }
    });
  }

  // --- Search Button Click Handler --- 
  if (searchButton && addressInput) { // Need both button and input
    searchButton.addEventListener('click', () => {
      const address = addressInput.value;
      if (address) {
        console.log(`Geocoding address: ${address}`);
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            console.log('Geocoding successful, centering map.');
            map.setCenter(results[0].geometry.location);
            map.setZoom(14); // Center and zoom on geocoded address
          } else {
            console.error('Geocode was not successful for the following reason: ' + status);
            alert('Could not find location for the address entered.'); // User feedback
          }
        });
      }
    });
  } else if (!searchButton) {
      console.warn('Search button (#address-search-button) not found.');
  }
}

/**
 * Tries to get the user's current location and centers the map.
 */
function attemptUserGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(userLocation);
        map.setZoom(13); // Zoom in a bit more if location found
        // Add or update current location marker
        if (currentLocationMarker) {
          currentLocationMarker.setPosition(userLocation);
        } else {
          currentLocationMarker = new google.maps.Marker({
            position: userLocation,
            map: map,
            icon: { 
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2 
            },
            title: 'Your Location'
          });
        }
      },
      (error) => {
        console.warn('Geolocation failed or was denied:', error.message);
        // Map remains centered on default location
      }
    );
  }
}

/**
 * Helper function to get a color based on category tag.
 * (Should match Handlebars helper colors if possible)
 */
function getCategoryColor(tag) {
  const colorMap = {
      healthcare: '#EF4444', // Red
      education: '#3B82F6',  // Blue
      environment: '#10B981', // Green
      community: '#A855F7', // Purple
      animals: '#F59E0B',  // Amber/Yellow
      other: '#6B7280'   // Gray
  };
  return colorMap[tag] || colorMap.other;
}

/**
 * Gets the appropriate CSS class for a category tag.
 * @param {string} tag - The category tag.
 * @returns {string} The CSS class.
 */
function getCategoryClass(tag) {
  const categoryColorMap = {
    'healthcare': 'red',
    'education': 'blue',
    'environment': 'green',
    'community': 'purple',
    'animals': 'yellow',
    'other': 'gray'
  };
  return categoryColorMap[tag] || 'gray';
}

/**
 * Gets the appropriate icon for a category tag.
 * @param {string} tag - The category tag.
 * @returns {string} The icon class.
 */
function getCategoryIcon(tag) {
  const categoryIconMap = {
    'healthcare': 'fas fa-heartbeat',
    'education': 'fas fa-graduation-cap',
    'environment': 'fas fa-tree',
    'community': 'fas fa-users',
    'animals': 'fas fa-paw',
    'other': 'fas fa-star'
  };
  return categoryIconMap[tag] || 'fas fa-star';
}

// Ensure initMap is called when the Google Maps script is loaded and ready.
// This assumes the map script is loaded asynchronously with a callback=initMap parameter,
// or you have other logic to ensure initMap runs after the API is available.
// If not using a callback, you might need: google.maps.event.addDomListener(window, 'load', initMap); 