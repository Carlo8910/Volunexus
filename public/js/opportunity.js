// Map variables
let locationMap;
let locationMarker;

// Initialize map for selecting location when creating/editing opportunity
function initLocationMap() {
  if (!google || !google.maps) {
    console.error('Google Maps API not loaded');
    return;
  }

  // Get the map element
  const mapElement = document.getElementById('location-map');
  if (!mapElement) return;

  // Create the map centered on a default location
  locationMap = new google.maps.Map(mapElement, {
    center: { lat: 40.7128, lng: -74.0060 }, // Default to New York
    zoom: 13,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false
  });

  // Try to get user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Center map on user's location
        locationMap.setCenter(userLocation);
        setLocationMarker(userLocation);
      },
      () => {
        console.log('Error: The Geolocation service failed.');
      }
    );
  }

  // Allow clicking on the map to set location
  locationMap.addListener('click', (event) => {
    setLocationMarker(event.latLng);
  });

  // Set up address autocomplete
  setupAddressAutocomplete();
}

// Set the location marker and update form values
function setLocationMarker(location) {
  if (locationMarker) {
    locationMarker.setMap(null);
  }

  locationMarker = new google.maps.Marker({
    position: location,
    map: locationMap,
    draggable: true
  });

  // Update hidden form field with coordinates
  const coordinatesField = document.getElementById('coordinates');
  if (coordinatesField) {
    coordinatesField.value = `${location.lng()},${location.lat()}`;
  }

  // When marker is dragged, update coordinates
  locationMarker.addListener('dragend', () => {
    const position = locationMarker.getPosition();
    if (coordinatesField) {
      coordinatesField.value = `${position.lng()},${position.lat()}`;
    }
  });

  // Reverse geocode to get address
  reverseGeocode(location);
}

// Setup address autocomplete
function setupAddressAutocomplete() {
  const addressInput = document.getElementById('address');
  if (!addressInput) return;

  const autocomplete = new google.maps.places.Autocomplete(addressInput);
  
  // When a place is selected, update the map
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;

    // Center map on selected place
    locationMap.setCenter(place.geometry.location);
    locationMap.setZoom(16);
    
    // Set marker at selected place
    setLocationMarker(place.geometry.location);
  });
}

// Reverse geocode a location to get address
function reverseGeocode(location) {
  const geocoder = new google.maps.Geocoder();
  const addressInput = document.getElementById('address');
  
  geocoder.geocode({ location: location }, (results, status) => {
    if (status === 'OK' && results[0] && addressInput) {
      addressInput.value = results[0].formatted_address;
    }
  });
}

// Show opportunity location on map
function showOpportunityMap(lat, lng) {
  if (!google || !google.maps) {
    console.error('Google Maps API not loaded');
    return;
  }

  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  const opportunityLocation = { lat, lng };

  // Create the map centered on the opportunity location
  const map = new google.maps.Map(mapElement, {
    center: opportunityLocation,
    zoom: 15,
    mapTypeControl: false,
    fullscreenControl: true,
    streetViewControl: false
  });

  // Add a marker for the opportunity location
  const marker = new google.maps.Marker({
    position: opportunityLocation,
    map: map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#34D399', // Green color
      fillOpacity: 0.8,
      strokeColor: '#ffffff',
      strokeWeight: 2
    }
  });
}

// Make showOpportunityMap available globally for the opportunity detail page
window.showOpportunityMap = showOpportunityMap;

// Handle Google Maps API callback if we're on the opportunity edit/create page
if (typeof window.initMapOnLoad !== 'function') {
  window.initMapOnLoad = function() {
    console.log('Google Maps API loaded (opportunity page)');
    if (document.getElementById('location-map')) {
      initLocationMap();
    } else if (document.getElementById('map')) {
      // We're on an opportunity detail page
      const mapElement = document.getElementById('map');
      const lat = parseFloat(mapElement.dataset.lat);
      const lng = parseFloat(mapElement.dataset.lng);
      showOpportunityMap(lat, lng);
    }
  };
} 