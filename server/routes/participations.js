const express = require('express');
const router = express.Router();
const { Participation, Training, User, Registration } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

// GET /api/participations (Get confirmed participations for a training)
router.get('/', authenticateToken, async (req, res) => {
  const { training_id } = req.query;

  if (!training_id) {
    return res.status(400).json({ detail: 'Fortbildungs-ID erforderlich' });
  }

  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    if (training.created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    const participations = await Participation.findAll({
      where: { training_id }
    });

    res.json(participations);
  } catch (error) {
    console.error('Error fetching participations:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der Teilnahmen' });
  }
});

// POST /api/participations (Confirm attendance for users)
router.post('/', authenticateToken, async (req, res) => {
  const { training_id, user_ids } = req.body; // user_ids is a list of user IDs to confirm

  if (!training_id || !Array.isArray(user_ids)) {
    return res.status(400).json({ detail: 'Ungültige Anfragedaten' });
  }

  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    if (training.created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    // 1. Remove old participations not in the new user_ids list
    await Participation.destroy({
      where: {
        training_id,
        user_id: {
          [require('sequelize').Op.notIn]: user_ids
        }
      }
    });

    // 2. Add or update confirmed participations
    for (const userId of user_ids) {
      const user = await User.findOne({ where: { user_id: userId } });
      if (!user) continue;

      let p = await Participation.findOne({ where: { training_id, user_id: userId } });
      if (!p) {
        p = await Participation.create({
          training_id,
          user_id: userId,
          user_name: user.name,
          confirmed: true,
          confirmed_at: new Date().toISOString()
        });

        // Send confirmation email
        await sendEmail(
          user.email,
          `Teilnahmebestätigung: ${training.title}`,
          `<html><body>
          <h2>Teilnahme bestätigt</h2>
          <p>Ihre Teilnahme an der Fortbildung "${training.title}" wurde bestätigt.</p>
          <p>Sie können Ihr Zertifikat nun in Ihrem Dashboard herunterladen.</p>
          </body></html>`
        );
      }
    }

    res.json({ message: 'Teilnahmen erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Error saving participations:', error);
    res.status(500).json({ detail: 'Fehler beim Bestätigen der Teilnahmen' });
  }
});

module.exports = router;
