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

// PUT /api/trainings/:training_id/publish
router.put('/:training_id/publish', authenticateToken, async (req, res) => {
  const { training_id } = req.params;
  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    if (training.created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    const newStatus = training.status === 'draft' ? 'published' : 'draft';
    await training.update({ status: newStatus, updated_at: new Date().toISOString() });

    await logChange(
      training_id,
      req.user.user_id,
      req.user.name,
      `Status geändert auf ${newStatus}`,
      { status: newStatus }
    );

    res.json(training);
  } catch (error) {
    console.error('Error publishing training:', error);
    res.status(500).json({ detail: 'Fehler beim Ändern des Veröffentlichungsstatus' });
  }
});

// GET /api/trainings/:training_id/participants
router.get('/:training_id/participants', authenticateToken, async (req, res) => {
  const { training_id } = req.params;
  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    if (training.created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    const registrations = await Registration.findAll({
      where: { 
        training_id,
        status: ['registered', 'waitlist']
      }
    });

    const { Participation } = require('../models');

    const result = [];
    for (const r of registrations) {
      const part = await Participation.findOne({
        where: {
          training_id,
          user_id: r.user_id
        }
      });

      result.push({
        registration_id: r.registration_id,
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        status: r.status,
        form_responses: r.form_responses || {},
        registered_at: r.registered_at,
        confirmed: part ? part.confirmed : false,
        confirmed_at: part ? part.confirmed_at : null
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der Teilnehmer' });
  }
});

// POST /api/trainings/:training_id/participants/confirm
router.post('/:training_id/participants/confirm', authenticateToken, async (req, res) => {
  const { training_id } = req.params;
  const user_ids = req.body;

  if (!Array.isArray(user_ids)) {
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

    const { Participation } = require('../models');

    for (const userId of user_ids) {
      const user = await User.findOne({ where: { user_id: userId } });
      if (!user) continue;

      let p = await Participation.findOne({ where: { training_id, user_id: userId } });
      if (!p) {
        await Participation.create({
          training_id,
          user_id: userId,
          user_name: user.name,
          confirmed: true,
          confirmed_at: new Date().toISOString()
        });

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

    res.json({ message: 'Teilnahmen erfolgreich bestätigt' });
  } catch (error) {
    console.error('Error confirming participants:', error);
    res.status(500).json({ detail: 'Fehler beim Bestätigen der Teilnahmen' });
  }
});

// DELETE /api/trainings/:training_id/participants/:registration_id
router.delete('/:training_id/participants/:registration_id', authenticateToken, async (req, res) => {
  const { training_id, registration_id } = req.params;
  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    if (training.created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    const registration = await Registration.findOne({ where: { registration_id, training_id } });
    if (!registration) {
      return res.status(404).json({ detail: 'Anmeldung nicht gefunden' });
    }

    const oldStatus = registration.status;

    registration.status = 'cancelled';
    registration.cancelled_at = new Date().toISOString();
    await registration.save();

    const { Participation } = require('../models');
    await Participation.destroy({
      where: {
        training_id,
        user_id: registration.user_id
      }
    });

    await sendEmail(
      registration.user_email,
      `Abmeldung: ${training.title}`,
      `<html><body><h2>Abmeldung bestätigt</h2><p>Ihre Abmeldung für die Fortbildung "${training.title}" war erfolgreich.</p></body></html>`
    );

    if (oldStatus === 'registered') {
      const nextInWaitlist = await Registration.findOne({
        where: {
          training_id,
          status: 'waitlist'
        },
        order: [['registered_at', 'ASC']]
      });

      if (nextInWaitlist) {
        nextInWaitlist.status = 'registered';
        await nextInWaitlist.save();

        await sendEmail(
          nextInWaitlist.user_email,
          `Nachgerückt: ${training.title}`,
          `<html><body>
          <h2>Sie sind nachgerückt!</h2>
          <p>Für die Fortbildung "${training.title}" ist ein Platz frei geworden. Sie wurden von der Warteliste als Teilnehmer registriert.</p>
          </body></html>`
        );
      }
    }

    res.json({ message: 'Teilnehmer erfolgreich entfernt' });
  } catch (error) {
    console.error('Error deleting participant:', error);
    res.status(500).json({ detail: 'Fehler beim Entfernen des Teilnehmers' });
  }
});

module.exports = router;
