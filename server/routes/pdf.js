const express = require('express');
const router = express.Router();
const { Participation, Training, Registration, Setting } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { generateCertificate, generateParticipantList } = require('../utils/pdfGenerator');

// GET /api/pdfs/certificate/:participation_id
router.get('/certificate/:participation_id', authenticateToken, async (req, res) => {
  const { participation_id } = req.params;

  try {
    const participation = await Participation.findOne({ where: { participation_id } });
    if (!participation) {
      return res.status(404).json({ detail: 'Teilnahme nicht gefunden' });
    }

    if (participation.user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    if (!participation.confirmed) {
      return res.status(400).json({ detail: 'Teilnahme noch nicht bestätigt' });
    }

    const training = await Training.findOne({ where: { training_id: participation.training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    const settings = await Setting.findOne();
    generateCertificate(res, participation.toJSON(), training.toJSON(), settings ? settings.toJSON() : null);
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    res.status(500).json({ detail: 'Fehler beim Generieren der PDF' });
  }
});

// GET /api/pdfs/participant-list/:training_id
router.get('/participant-list/:training_id', authenticateToken, async (req, res) => {
  const { training_id } = req.params;
  const { selected_fields } = req.query;

  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    if (training.created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    const registrations = await Registration.findAll({
      where: { training_id, status: 'registered' }
    });

    const settings = await Setting.findOne();
    const selectedFieldIds = selected_fields ? selected_fields.split(',') : [];

    generateParticipantList(
      res,
      registrations.map(r => r.toJSON()),
      training.toJSON(),
      settings ? settings.toJSON() : null,
      selectedFieldIds
    );
  } catch (error) {
    console.error('Error generating participant list PDF:', error);
    res.status(500).json({ detail: 'Fehler beim Generieren der PDF' });
  }
});

module.exports = router;
