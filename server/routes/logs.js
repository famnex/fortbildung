const express = require('express');
const router = express.Router();
const { ChangeLog } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/admin/logs
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await ChangeLog.findAll({
      order: [['created_at', 'DESC']],
      limit: 1000
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der Protokolle' });
  }
});

module.exports = router;
