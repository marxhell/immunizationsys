const express = require('express');
const { protect } = require('../middleware/auth');
const { createBackup, listBackups } = require('../utils/backup');

const router = express.Router();

/**
 * POST /api/backup
 * Trigger a manual database backup
 */
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can perform backups' });
    }

    const result = await createBackup();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ success: false, message: 'Backup failed: ' + error.message });
  }
});

/**
 * GET /api/backup
 * List all available backups
 */
router.get('/', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can view backups' });
    }

    const backups = listBackups();
    res.json({ success: true, data: backups });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ success: false, message: 'Failed to list backups' });
  }
});

module.exports = router;