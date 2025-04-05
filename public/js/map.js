// Map initialization
let map;
let markers = [];
let infoWindow;
let currentLocationMarker;

// Initialize the map with opportunities
function initMap(opportunities) {
  if (!google || !google.maps) {
    console.error('Google Maps API not loaded');
    return;
  }

  // Create map centered on a default location (can be adjusted)
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 40.7128, lng: -74.0060 }, // Default to New York
    zoom: 12,
    mapTypeControl: false,
    fullscreenControl: true,
    streetViewControl: false
  });

  infoWindow = new google.maps.InfoWindow();

  // Try to get user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Center map on user's location
        map.setCenter(userLocation);

        // Add a marker for the user's location
        currentLocationMarker = new google.maps.Marker({
          position: userLocation,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          },
          title: 'Your Location'
        });
      },
      () => {
        console.log('Error: The Geolocation service failed.');
      }
    );
  }

  // Add opportunities to the map
  if (opportunities && opportunities.length > 0) {
    addOpportunitiesToMap(opportunities);
  }

  // Set up address search
  setupAddressSearch();

  // Set up tag filter
  setupTagFilter(opportunities);
}

// Add opportunity markers to the map
function addOpportunitiesToMap(opportunities) {
  // Clear existing markers
  clearMarkers();

  // Get the selected tag filter
  const tagFilter = document.getElementById('tag-filter').value;

  // Filter opportunities if a tag is selected
  const filteredOpportunities = tagFilter 
    ? opportunities.filter(opp => opp.tag === tagFilter) 
    : opportunities;

  // Add markers for each opportunity
  filteredOpportunities.forEach(opportunity => {
    if (opportunity.location && 
        opportunity.location.coordinates && 
        opportunity.location.coordinates.coordinates) {
      
      // MongoDB stores as [lng, lat], Google Maps uses {lat, lng}
      const position = {
        lat: opportunity.location.coordinates.coordinates[1],
        lng: opportunity.location.coordinates.coordinates[0]
      };

      // Create marker
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: opportunity.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#34D399', // Green color
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // Add click listener to show info window
      marker.addListener('click', () => {
        // Format date and time
        const date = new Date(opportunity.dateTime);
        const formattedDate = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const formattedTime = date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit'
        });

        // Create content for info window
        const contentString = `
          <div class="info-window">
            <h3 class="font-bold text-lg">${opportunity.title}</h3>
            <p class="text-sm text-gray-600">${formattedDate} at ${formattedTime}</p>
            <p class="text-sm text-gray-600">${opportunity.location.address}</p>
            <p class="my-2">${opportunity.description.substring(0, 150)}${opportunity.description.length > 150 ? '...' : ''}</p>
            <div class="flex justify-between items-center">
              <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">${opportunity.tag}</span>
              <a href="/opportunities/${opportunity._id}" class="text-sm text-green-600 hover:text-green-800">View Details</a>
            </div>
          </div>
        `;

        infoWindow.setContent(contentString);
        infoWindow.open(map, marker);
      });

      // Store marker
      markers.push(marker);
    }
  });
}

// Clear all markers from the map
function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

// Set up address search functionality
function setupAddressSearch() {
  const addressInput = document.getElementById('address');
  const searchButton = document.getElementById('find-opportunities');

  // Create autocomplete
  if (addressInput) {
    const autocomplete = new google.maps.places.Autocomplete(addressInput);
    
    // Bias the search results to current map bounds
    autocomplete.bindTo('bounds', map);

    // Listen for place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      // Center map on selected place
      if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(17);
      }
    });
  }

  // Add search button click handler
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      const address = addressInput.value;
      if (address) {
        // Geocode the address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            map.setCenter(results[0].geometry.location);
            map.setZoom(14);

            // Get opportunities near this location
            fetchNearbyOpportunities(
              results[0].geometry.location.lat(),
              results[0].geometry.location.lng()
            );
          }
        });
      }
    });
  }
}

// Set up tag filter functionality
function setupTagFilter(opportunities) {
  const tagFilter = document.getElementById('tag-filter');
  
  if (tagFilter) {
    tagFilter.addEventListener('change', () => {
      // Re-add opportunities with the selected filter
      addOpportunitiesToMap(opportunities);
    });
  }
}

// Fetch opportunities near a specified location
function fetchNearbyOpportunities(lat, lng, maxDistance = 10000) {
  fetch(`/opportunities/near?lat=${lat}&lng=${lng}&maxDistance=${maxDistance}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        addOpportunitiesToMap(data.data);
      }
    })
    .catch(error => {
      console.error('Error fetching nearby opportunities:', error);
    });
} 