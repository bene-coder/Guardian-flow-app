/**
 * Calculate distance between two coordinates using Haversine formula
 */
function getDistanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Check if a point is outside a circular geofence
 */
function checkGeofenceViolation(lat, lng, centerLat, centerLng, radiusKm) {
  const distance = getDistanceInKm(lat, lng, centerLat, centerLng);
  
  if (distance > radiusKm) {
    return {
      violated: true,
      distance: distance.toFixed(2),
      exceededBy: (distance - radiusKm).toFixed(2)
    };
  }
  
  return false;
}

/**
 * Calculate bearing/heading between two points
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = deg2rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(deg2rad(lat2));
  const x = Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
            Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x);
  bearing = bearing * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

/**
 * Check if coordinates are valid
 */
function isValidCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

module.exports = {
  getDistanceInKm,
  checkGeofenceViolation,
  calculateBearing,
  isValidCoordinates
};