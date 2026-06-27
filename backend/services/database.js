const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ============ LOCATION OPERATIONS ============

/**
 * Save GPS location to database
 */
async function saveLocation(vehicleId, locationData) {
  const { lat, lng, speed, heading, accuracy } = locationData;
  
  const { data, error } = await supabase
    .from('locations')
    .insert([{
      vehicle_id: vehicleId,
      lat,
      lng,
      speed: speed || 0,
      heading: heading || 0,
      accuracy: accuracy || 0,
      recorded_at: new Date()
    }])
    .select();

  if (error) {
    console.error('Database error (saveLocation):', error);
    throw error;
  }

  return data[0];
}

/**
 * Get vehicle location history
 */
async function getVehicleHistory(vehicleId, hoursAgo = 24) {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Database error (getVehicleHistory):', error);
    throw error;
  }

  return data;
}

/**
 * Get latest location for all vehicles
 */
async function getLatestLocations() {
  const { data, error } = await supabase
    .rpc('get_latest_locations'); // Custom SQL function

  if (error) {
    console.error('Database error (getLatestLocations):', error);
    throw error;
  }

  return data;
}

// ============ ALERT OPERATIONS ============

/**
 * Save alert/incident
 */
async function saveAlert(alertData) {
  const { data, error } = await supabase
    .from('alerts')
    .insert([{
      id: alertData.id,
      type: alertData.type,
      vehicle_id: alertData.vehicleId,
      driver_id: alertData.driverId,
      lat: alertData.lat,
      lng: alertData.lng,
      status: alertData.status || 'active',
      metadata: alertData.metadata || {},
      blockchain_tx: alertData.blockchainTx || null
    }])
    .select();

  if (error) {
    console.error('Database error (saveAlert):', error);
    throw error;
  }

  return data[0];
}

/**
 * Get all active alerts
 */
async function getActiveAlerts() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Database error (getActiveAlerts):', error);
    throw error;
  }

  return data;
}

/**
 * Update alert status
 */
async function updateAlertStatus(alertId, status) {
  const { data, error } = await supabase
    .from('alerts')
    .update({ status, updated_at: new Date() })
    .eq('id', alertId)
    .select();

  if (error) {
    console.error('Database error (updateAlertStatus):', error);
    throw error;
  }

  return data[0];
}

// ============ VEHICLE OPERATIONS ============

/**
 * Register new vehicle
 */
async function registerVehicle(vehicleData) {
  const { data, error } = await supabase
    .from('vehicles')
    .insert([{
      id: vehicleData.id,
      name: vehicleData.name,
      driver_name: vehicleData.driverName,
      driver_phone: vehicleData.driverPhone,
      status: 'active'
    }])
    .select();

  if (error) {
    console.error('Database error (registerVehicle):', error);
    throw error;
  }

  return data[0];
}

/**
 * Get all vehicles
 */
async function getAllVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Database error (getAllVehicles):', error);
    throw error;
  }

  return data;
}

/**
 * Update vehicle status
 */
async function updateVehicleStatus(vehicleId, status) {
  const { data, error } = await supabase
    .from('vehicles')
    .update({ status })
    .eq('id', vehicleId)
    .select();

  if (error) {
    console.error('Database error (updateVehicleStatus):', error);
    throw error;
  }

  return data[0];
}

// ============ GEOFENCE OPERATIONS ============

/**
 * Create geofence
 */
async function createGeofence(geofenceData) {
  const { data, error } = await supabase
    .from('geofences')
    .insert([{
      id: geofenceData.id,
      name: geofenceData.name,
      center_lat: geofenceData.centerLat,
      center_lng: geofenceData.centerLng,
      radius: geofenceData.radius,
      type: geofenceData.type || 'circular'
    }])
    .select();

  if (error) {
    console.error('Database error (createGeofence):', error);
    throw error;
  }

  return data[0];
}

/**
 * Get all geofences
 */
async function getAllGeofences() {
  const { data, error } = await supabase
    .from('geofences')
    .select('*');

  if (error) {
    console.error('Database error (getAllGeofences):', error);
    throw error;
  }

  return data;
}

module.exports = {
  supabase,
  saveLocation,
  getVehicleHistory,
  getLatestLocations,
  saveAlert,
  getActiveAlerts,
  updateAlertStatus,
  registerVehicle,
  getAllVehicles,
  updateVehicleStatus,
  createGeofence,
  getAllGeofences
};