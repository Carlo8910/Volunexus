// Map initialization
let map;
let infoWindow;
let allOpportunityData = []; // Store all opportunities fetched from server
let visibleMarkers = []; // Store currently visible markers
let currentLocationMarker;

/**
 * Initializes the Google Map, adds markers, and sets up filters.
 * Assign to window scope for Google Maps callback.
 */
window.initMap = function() {
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
}; // End of window.initMap assignment

/**
 * Clears existing markers and adds new ones based on current filters.
 */
function displayOpportunities() {
  clearMarkers(); // Clear existing markers from map

  const searchTerm = document.getElementById('search-term')?.value.toLowerCase() || '';
  const tagFilter = document.getElementById('tag-filter')?.value || '';

  const filteredOpportunities = allOpportunityData.filter(opp => {
    // Basic coordinate check
    if (!opp.coordinates || typeof opp.coordinates.lat !== 'number' || typeof opp.coordinates.lng !== 'number') {
        return false;
    }
    
    const matchesTag = !tagFilter || opp.tag === tagFilter;
    const matchesSearch = !searchTerm || 
                         (opp.title && opp.title.toLowerCase().includes(searchTerm)) || 
                         (opp.description && opp.description.toLowerCase().includes(searchTerm)) ||
                         (opp.location && opp.location.toLowerCase().includes(searchTerm)); // Search location address string

    return matchesTag && matchesSearch;
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
    <div style="max-width: 250px; padding: 5px; color: #333;">
      <h3 style="margin: 0 0 5px 0; font-weight: bold; color: #000;">${opportunity.title}</h3>
      <p style="margin: 2px 0; font-size: 0.85em; color: #555;">
        <i class="fas fa-calendar-alt fa-fw" style="color: #888;"></i> ${formattedDate} at ${formattedTime}
      </p>
      <p style="margin: 2px 0; font-size: 0.85em; color: #555;">
        <i class="fas fa-map-marker-alt fa-fw" style="color: #888;"></i> ${opportunity.location || 'Location TBD'}
      </p>
      ${opportunity.description ? `<p style="margin: 8px 0; font-size: 0.9em; color: #333;">${opportunity.description.substring(0, 100)}${opportunity.description.length > 100 ? '...' : ''}</p>` : ''}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
        <span style="font-size: 0.75em; background-color: #e0e0e0; color: #333; padding: 2px 6px; border-radius: 10px; text-transform: capitalize;">${opportunity.tag}</span>
        <a href="/opportunities/${opportunity._id}" target="_blank" style="font-size: 0.85em; color: #0056b3; text-decoration: none; font-weight: 500;">View Details</a>
      </div>
    </div>
  `;

  infoWindow.setContent(content);
  infoWindow.open(map, marker);
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
  const tagFilterSelect = document.getElementById('tag-filter');

  if (searchTermInput) {
    // Use 'input' event for real-time filtering as user types
    searchTermInput.addEventListener('input', displayOpportunities); 
  }
  if (tagFilterSelect) {
    tagFilterSelect.addEventListener('change', displayOpportunities);
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

// Ensure initMap is called when the Google Maps script is loaded and ready.
// This assumes the map script is loaded asynchronously with a callback=initMap parameter,
// or you have other logic to ensure initMap runs after the API is available.
// If not using a callback, you might need: google.maps.event.addDomListener(window, 'load', initMap); 