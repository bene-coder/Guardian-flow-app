const express = require('express');
const router = express.Router();
const { saveAlert, getActiveAlerts, updateAlertStatus } = require('../services/database');
const { logToBlockchain } = require('../services/blockchain');
const { logPanicAlert } = require('../services/blockchain');

/**
 * Handle panic button press
 */
router.post('/panic', async (req, res) => {
  try {
    const { vehicleId, lat, lng, driverId } = req.body;

    if (!vehicleId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Create alert object
    const alert = {
      id: `alert-${Date.now()}-${vehicleId}`,
      type: 'PANIC',
      vehicleId,
      driverId,
      lat,
      lng,
      status: 'active',
      metadata: {
        source: 'driver_app',
        urgency: 'critical'
      }
    };

    // Save to database
    await saveAlert(alert);

    await logPanicAlert(vehicleId, lat, lng, driverId);
    // Log to blockchain 
    logToBlockchain('PANIC_ALERT', vehicleId, alert)
      .then(blockchain => {
        console.log('✅ Logged to blockchain:', blockchain.txHash);
        // Update alert with blockchain tx
        alert.blockchainTx = blockchain.txHash;
      })
      .catch(err => {
        console.error('❌ Blockchain logging failed:', err.message);
      });

    // Broadcast to dashboards
    const io = req.app.get('io');
    io.emit('panic-alert', alert);

    console.log(`🚨 PANIC ALERT: ${vehicleId} at [${lat}, ${lng}]`);

    res.json({
      success: true,
      alertId: alert.id,
      message: 'Panic alert received. Help is on the way.'
    });

  } catch (error) {
    console.error('Panic alert error:', error);
    res.status(500).json({ error: 'Failed to process panic alert' });
  }
});

/**
 * Get all active alerts
 */
router.get('/', async (req, res) => {
  try {
    const alerts = await getActiveAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * Update alert status (acknowledge, resolve, etc.)
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'acknowledged', 'resolved'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be: active, acknowledged, or resolved'
      });
    }

    const updatedAlert = await updateAlertStatus(id, status);

    // Broadcast update
    const io = req.app.get('io');
    io.emit('alert-updated', updatedAlert);

    res.json({
      success: true,
      alert: updatedAlert
    });

  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

module.exports = router;