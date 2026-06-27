let io;

function initializeWebSocket(socketIo) {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Send initial state when client connects
    socket.on('request-initial-state', async () => {
      const { getAllVehicles, getActiveAlerts, getAllGeofences } = require('./database');
      
      try {
        const [vehicles, alerts, geofences] = await Promise.all([
          getAllVehicles(),
          getActiveAlerts(),
          getAllGeofences()
        ]);

        socket.emit('initial-state', {
          vehicles,
          alerts,
          geofences,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Error sending initial state:', error);
        socket.emit('error', { message: 'Failed to load initial state' });
      }
    });

    // Request vehicle history
    socket.on('request-vehicle-history', async (data) => {
      const { getVehicleHistory } = require('./database');
      const { vehicleId, hours } = data;

      try {
        const history = await getVehicleHistory(vehicleId, hours || 24);
        socket.emit('vehicle-history', {
          vehicleId,
          history,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error fetching vehicle history:', error);
        socket.emit('error', { message: 'Failed to fetch history' });
      }
    });

    // Dashboard subscribes to specific vehicle
    socket.on('subscribe-vehicle', (vehicleId) => {
      socket.join(`vehicle-${vehicleId}`);
      console.log(`📡 Client ${socket.id} subscribed to ${vehicleId}`);
    });

    // Dashboard unsubscribes from vehicle
    socket.on('unsubscribe-vehicle', (vehicleId) => {
      socket.leave(`vehicle-${vehicleId}`);
      console.log(`📴 Client ${socket.id} unsubscribed from ${vehicleId}`);
    });

    // Acknowledge alert
    socket.on('acknowledge-alert', async (alertId) => {
      const { updateAlertStatus } = require('./database');
      
      try {
        await updateAlertStatus(alertId, 'acknowledged');
        io.emit('alert-updated', { 
          alertId, 
          status: 'acknowledged',
          acknowledgedBy: socket.id,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error acknowledging alert:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 WebSocket service initialized');
}

/**
 * Broadcast location update to all clients
 */
function broadcastLocationUpdate(vehicleId, locationData) {
  if (!io) return;
  
  io.emit('location-update', {
    vehicleId,
    ...locationData,
    timestamp: Date.now()
  });

  // Also emit to vehicle-specific room
  io.to(`vehicle-${vehicleId}`).emit('vehicle-location', {
    vehicleId,
    ...locationData
  });
}

/**
 * Broadcast panic alert
 */
function broadcastPanicAlert(alert) {
  if (!io) return;
  
  io.emit('panic-alert', alert);
  console.log(`🚨 Broadcasted panic alert: ${alert.id}`);
}

/**
 * Broadcast geofence violation
 */
function broadcastGeofenceViolation(violation) {
  if (!io) return;
  
  io.emit('geofence-violation', violation);
  console.log(`⚠️  Broadcasted geofence violation: ${violation.vehicleId}`);
}

/**
 * Broadcast dead man switch alert
 */
function broadcastDeadManAlert(alert) {
  if (!io) return;
  
  io.emit('dead-man-alert', alert);
  console.log(`💀 Broadcasted dead man alert: ${alert.vehicleId}`);
}

module.exports = {
  initializeWebSocket,
  broadcastLocationUpdate,
  broadcastPanicAlert,
  broadcastGeofenceViolation,
  broadcastDeadManAlert
};