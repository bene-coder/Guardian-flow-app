const express = require('express');
const router = express.Router();
const { 
  registerVehicle, 
  getAllVehicles, 
  updateVehicleStatus 
} = require('../services/database');

/**
 * POST /api/vehicles
 * Register a new vehicle
 */
router.post('/', async (req, res) => {
  try {
    const { id, name, driverName, driverPhone } = req.body;

    if (!id || !name) {
      return res.status(400).json({
        error: 'Missing required fields: id, name'
      });
    }

    const vehicle = await registerVehicle({
      id,
      name,
      driverName,
      driverPhone
    });

    // Broadcast to dashboards
    const io = req.app.get('io');
    io.emit('vehicle-registered', vehicle);

    res.json({
      success: true,
      vehicle
    });

  } catch (error) {
    console.error('Register vehicle error:', error);
    res.status(500).json({ error: 'Failed to register vehicle' });
  }
});

/**
 * GET /api/vehicles
 * Get all vehicles
 */
router.get('/', async (req, res) => {
  try {
    const vehicles = await getAllVehicles();
    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

/**
 * GET /api/vehicles/:id
 * Get specific vehicle details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { supabase } = require('../services/database');

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicle);

  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

/**
 * PATCH /api/vehicles/:id/status
 * Update vehicle status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'maintenance', 'emergency'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const vehicle = await updateVehicleStatus(id, status);

    // Broadcast update
    const io = req.app.get('io');
    io.emit('vehicle-status-changed', { vehicleId: id, status });

    res.json({
      success: true,
      vehicle
    });

  } catch (error) {
    console.error('Update vehicle status error:', error);
    res.status(500).json({ error: 'Failed to update vehicle status' });
  }
});

/**
 * DELETE /api/vehicles/:id
 * Delete vehicle (soft delete - set status to inactive)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await updateVehicleStatus(id, 'inactive');

    res.json({
      success: true,
      message: 'Vehicle deactivated',
      vehicle
    });

  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

module.exports = router;