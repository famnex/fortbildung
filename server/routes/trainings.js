const express = require('express');
const router = express.Router();
const { Training, Registration, User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { ChangeLog } = require('../models');

async function logChange(trainingId, userId, userName, action, changes = {}) {
  try {
    await ChangeLog.create({
      training_id: trainingId,
      user_id: userId,
      user_name: userName,
      action,
      changes,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging change:', error);
  }
}

// GET /api/trainings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const trainings = await Training.findAll({
      where: { status: 'published' }
    });

    const now = new Date();
    const futureTrainings = [];

    for (const t of trainings) {
      const dates = t.dates;
      let isFuture = true;

      if (dates && dates.length > 0) {
        const lastDateObj = dates.reduce((max, d) => {
          return new Date(d.end_datetime) > new Date(max.end_datetime) ? d : max;
        }, dates[0]);

        const lastEnd = new Date(lastDateObj.end_datetime);
        isFuture = lastEnd > now;
      }

      if (isFuture) {
        const count = await Registration.count({
          where: { training_id: t.training_id, status: 'registered' }
        });
        const tJSON = t.toJSON();
        tJSON.current_participants = count;
        futureTrainings.push(tJSON);
      }
    }

    res.json(futureTrainings);
  } catch (error) {
    console.error('Error fetching trainings:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der Fortbildungen' });
  }
});

// GET /api/trainings/my
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const trainings = await Training.findAll({
      where: { created_by: req.user.user_id }
    });

    const result = [];
    for (const t of trainings) {
      const count = await Registration.count({
        where: { training_id: t.training_id, status: 'registered' }
      });
      const tJSON = t.toJSON();
      tJSON.current_participants = count;
      result.push(tJSON);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching my trainings:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der eigenen Fortbildungen' });
  }
});

// GET /api/trainings/all
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const trainings = await Training.findAll();

    const result = [];
    for (const t of trainings) {
      const count = await Registration.count({
        where: { training_id: t.training_id, status: 'registered' }
      });
      const tJSON = t.toJSON();
      tJSON.current_participants = count;
      result.push(tJSON);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching all trainings:', error);
    res.status(500).json({ detail: 'Fehler beim Laden aller Fortbildungen' });
  }
});

// POST /api/trainings
router.post('/', authenticateToken, async (req, res) => {
  try {
    const newTraining = await Training.create({
      ...req.body,
      created_by: req.user.user_id,
      created_by_name: req.user.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await logChange(
      newTraining.training_id,
      req.user.user_id,
      req.user.name,
      'Fortbildung erstellt',
      { title: newTraining.title }
    );

    res.status(201).json(newTraining);
  } catch (error) {
    console.error('Error creating training:', error);
    res.status(500).json({ detail: 'Fehler beim Erstellen der Fortbildung' });
  }
});

// GET /api/trainings/:training_id
router.get('/:training_id', authenticateToken, async (req, res) => {
  const { training_id } = req.params;
  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    const count = await Registration.count({
      where: { training_id, status: 'registered' }
    });

    const tJSON = training.toJSON();
    tJSON.current_participants = count;
    res.json(tJSON);
  } catch (error) {
    console.error('Error fetching training:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der Fortbildung' });
  }
});

// PUT /api/trainings/:training_id
router.put('/:training_id', authenticateToken, async (req, res) => {
  const { training_id } = req.params;
  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    if (training.created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    const oldStatus = training.status;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    await training.update(updateData);

    await logChange(
      training_id,
      req.user.user_id,
      req.user.name,
      'Fortbildung aktualisiert',
      updateData
    );

    // Notify participants if published and updated
    if (oldStatus === 'published') {
      const registrations = await Registration.findAll({
        where: { training_id, status: 'registered' }
      });

      for (const reg of registrations) {
        await sendEmail(
          reg.user_email,
          `Änderung: ${training.title}`,
          `<html><body>
          <h2>Fortbildung wurde geändert</h2>
          <p>Die Fortbildung "${training.title}" wurde aktualisiert.</p>
          <p>Bitte überprüfen Sie die Details in Ihrem Dashboard.</p>
          </body></html>`
        );
      }
    }

    res.json(training);
  } catch (error) {
    console.error('Error updating training:', error);
    res.status(500).json({ detail: 'Fehler beim Bearbeiten der Fortbildung' });
  }
});

// DELETE /api/trainings/:training_id
router.delete('/:training_id', authenticateToken, async (req, res) => {
  const { training_id } = req.params;
  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    if (training.created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    // Delete associated registrations and participations
    await Registration.destroy({ where: { training_id } });
    const { Participation } = require('../models');
    await Participation.destroy({ where: { training_id } });

    await training.destroy();

    res.json({ message: 'Fortbildung erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting training:', error);
    res.status(500).json({ detail: 'Fehler beim Löschen der Fortbildung' });
  }
});

module.exports = router;
