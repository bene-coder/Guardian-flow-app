const express = require('express');
const router = express.Router();
const { saveLocation, getVehicleHistory, getLatestLocations } = require('../services/database');
const { updateVehicleState, checkGeofences } = require('../services/analytics');

/**
 * POST /api/location
 * Receive location update from mobile app
 */
router.post('/', async (req, res) => {
  try {
    const { vehicleId, lat, lng, speed, heading, accuracy } = req.body;

    // Validation
    if (!vehicleId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: vehicleId, lat, lng'
      });
    }

    // Save to database
    const location = await saveLocation(vehicleId, {
      lat,
      lng,
      speed,
      heading,
      accuracy
    });

      // Update analytics state (for Dead Man Switch monitoring)
    updateVehicleState(vehicleId, { lat, lng, speed });

    // Check geofence violations
    await checkGeofences(vehicleId, lat, lng);

    // Broadcast to all connected dashboards via WebSocket
    const io = req.app.get('io');
    io.emit('location-update', {
      vehicleId,
      lat,
      lng,
      speed,
      heading,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      vehicleId,
      timestamp: location.timestamp
    });

  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

/**
 * POST /api/location/bulk
 * Bulk upload locations (offline mode)
 */
router.post('/bulk', async (req, res) => {
  try {
    const { vehicleId, locations } = req.body;

    if (!vehicleId || !Array.isArray(locations)) {
      return res.status(400).json({
        error: 'Invalid bulk upload format'
      });
    }

    // Save all locations
    const promises = locations.map(loc =>
      saveLocation(vehicleId, loc)
    );
    await Promise.all(promises);

    // Broadcast sync event
    const io = req.app.get('io');
    io.emit('bulk-sync', {
      vehicleId,
      count: locations.length,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      synced: locations.length
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

/**
 * GET /api/location/latest
 * Get latest position of all vehicles
 */
router.get('/latest', async (req, res) => {
  try {
    const locations = await getLatestLocations();
    res.json(locations);
  } catch (error) {
    console.error('Get latest locations error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

/**
 * GET /api/location/:vehicleId/history
 * Get historical route for a vehicle
 */
router.get('/:vehicleId/history', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const hours = parseInt(req.query.hours) || 24;

    const history = await getVehicleHistory(vehicleId, hours);

    res.json({
      vehicleId,
      points: history.length,
      data: history
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;