const express = require('express');
const router = express.Router();
const { createGeofence, getAllGeofences } = require('../services/database');
const { checkGeofenceViolation } = require('../utils/geo');

/**
 * POST /api/geofence
 * Create a new geofence
 */
router.post('/', async (req, res) => {
  try {
    const { name, centerLat, centerLng, radius } = req.body;

    if (!name || !centerLat || !centerLng || !radius) {
      return res.status(400).json({
        error: 'Missing required fields: name, centerLat, centerLng, radius'
      });
    }

    const geofence = await createGeofence({
      id: `gf-${Date.now()}`,
      name,
      centerLat,
      centerLng,
      radius
    });

    // Broadcast to dashboards
    const io = req.app.get('io');
    io.emit('geofence-created', geofence);

    res.json({
      success: true,
      geofence
    });

  } catch (error) {
    console.error('Create geofence error:', error);
    res.status(500).json({ error: 'Failed to create geofence' });
  }
});

/**
 * GET /api/geofence
 * Get all geofences
 */
router.get('/', async (req, res) => {
  try {
    const geofences = await getAllGeofences();
    res.json(geofences);
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(500).json({ error: 'Failed to fetch geofences' });
  }
});

/**
 * POST /api/geofence/check
 * Check if a location violates any geofence
 */
router.post('/check', async (req, res) => {
  try {
    const { vehicleId, lat, lng } = req.body;

    if (!vehicleId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: vehicleId, lat, lng'
      });
    }

    const geofences = await getAllGeofences();
    const violations = [];

    for (const gf of geofences) {
      const isViolation = checkGeofenceViolation(
        lat, 
        lng, 
        gf.center_lat, 
        gf.center_lng, 
        gf.radius
      );

      if (isViolation) {
        violations.push({
          geofenceId: gf.id,
          geofenceName: gf.name,
          distance: isViolation.distance
        });
      }
    }

    res.json({
      vehicleId,
      violations,
      isViolating: violations.length > 0
    });

  } catch (error) {
    console.error('Check geofence error:', error);
    res.status(500).json({ error: 'Failed to check geofence' });
  }
});

/**
 * DELETE /api/geofence/:id
 * Delete a geofence
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { supabase } = require('../services/database');

    const { error } = await supabase
      .from('geofences')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Broadcast deletion
    const io = req.app.get('io');
    io.emit('geofence-deleted', { geofenceId: id });

    res.json({
      success: true,
      message: 'Geofence deleted'
    });

  } catch (error) {
    console.error('Delete geofence error:', error);
    res.status(500).json({ error: 'Failed to delete geofence' });
  }
});

module.exports = router;