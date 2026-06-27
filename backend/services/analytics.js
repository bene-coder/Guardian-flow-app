const { saveAlert } = require('./database');
const { broadcastDeadManAlert, broadcastGeofenceViolation } = require('./websocket');
const { checkGeofenceViolation } = require('../utils/geo');
const { logToBlockchain } = require('./blockchain');

// Track vehicle states
const vehicleStates = new Map();

/**
 * Update vehicle state and check for anomalies
 */
function updateVehicleState(vehicleId, locationData) {
  const { lat, lng, speed } = locationData;
  const now = Date.now();

  const previousState = vehicleStates.get(vehicleId);

  const newState = {
    lat,
    lng,
    speed,
    lastUpdate: now,
    isMoving: speed > 1,
    lastMoveTime: speed > 1 ? now : (previousState?.lastMoveTime || now)
  };

  vehicleStates.set(vehicleId, newState);

  // Check for dead man switch
  checkDeadManSwitch(vehicleId, newState);
}

/**
 * Dead Man Switch: Alert if vehicle stopped for too long
 */
async function checkDeadManSwitch(vehicleId, state) {
  const THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
  const now = Date.now();

  if (!state.isMoving) {
    const stoppedDuration = now - state.lastMoveTime;

    if (stoppedDuration > THRESHOLD_MS) {
      console.log(`💀 Dead man switch triggered for ${vehicleId}`);

      const alert = {
        id: `dead-man-${Date.now()}-${vehicleId}`,
        type: 'DEAD_MAN_SWITCH',
        vehicleId,
        lat: state.lat,
        lng: state.lng,
        status: 'active',
        metadata: {
          stoppedDuration: Math.floor(stoppedDuration / 60000),
          lastSpeed: state.speed,
          triggeredAt: new Date().toISOString()
        }
      };

      // Save to database
      await saveAlert(alert);

      // Log to blockchain
      logToBlockchain('DEAD_MAN_SWITCH', vehicleId, alert)
        .then(blockchain => {
          if (blockchain.success) {
            alert.blockchainTx = blockchain.txHash;
          }
        })
        .catch(err => console.error('Blockchain error:', err));

      // Broadcast alert
      broadcastDeadManAlert(alert);

      // Reset to prevent spam
      state.lastMoveTime = now;
      vehicleStates.set(vehicleId, state);
    }
  }
}

/**
 * Check geofence violations
 */
async function checkGeofences(vehicleId, lat, lng) {
  const { getAllGeofences } = require('./database');

  try {
    const geofences = await getAllGeofences();

    for (const gf of geofences) {
      const violation = checkGeofenceViolation(
        lat,
        lng,
        gf.center_lat,
        gf.center_lng,
        gf.radius
      );

      if (violation) {
        const alert = {
          id: `gf-viol-${Date.now()}-${vehicleId}`,
          type: 'GEOFENCE_VIOLATION',
          vehicleId,
          lat,
          lng,
          status: 'active',
          metadata: {
            geofenceId: gf.id,
            geofenceName: gf.name,
            distance: violation.distance,
            exceededBy: violation.exceededBy
          }
        };

        await saveAlert(alert);

        logToBlockchain('GEOFENCE_VIOLATION', vehicleId, alert)
          .catch(err => console.error('Blockchain error:', err));

        broadcastGeofenceViolation(alert);

        console.log(`⚠️  Geofence violation: ${vehicleId} left ${gf.name}`);
      }
    }
  } catch (error) {
    console.error('Geofence check error:', error);
  }
}

/**
 * Start monitoring interval
 */
function startMonitoring() {
  setInterval(() => {
    vehicleStates.forEach((state, vehicleId) => {
      checkDeadManSwitch(vehicleId, state);
    });
  }, 60 * 1000); // Every 60 seconds

  console.log('🔍 Analytics monitoring started');
}

module.exports = {
  updateVehicleState,
  checkGeofences,
  startMonitoring
};