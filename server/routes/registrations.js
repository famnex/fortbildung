const express = require('express');
const router = express.Router();
const { Registration, Training, User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

// GET /api/registrations or /api/registrations/my
router.get(['/', '/my'], authenticateToken, async (req, res) => {
  try {
    const registrations = await Registration.findAll({
      where: { user_id: req.user.user_id }
    });

    const result = [];
    for (const r of registrations) {
      const training = await Training.findOne({ where: { training_id: r.training_id } });
      const rJSON = r.toJSON();
      rJSON.training = training ? training.toJSON() : null;
      result.push(rJSON);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der Anmeldungen' });
  }
});

// POST /api/registrations
router.post('/', authenticateToken, async (req, res) => {
  const { training_id, form_responses } = req.body;

  if (!training_id) {
    return res.status(400).json({ detail: 'Fortbildungs-ID erforderlich' });
  }

  try {
    const training = await Training.findOne({ where: { training_id } });
    if (!training) {
      return res.status(404).json({ detail: 'Fortbildung nicht gefunden' });
    }

    if (training.type === 'external') {
      return res.status(400).json({ detail: 'Anmeldungen für externe Veranstaltungen sind nicht möglich' });
    }

    // Check if user is already registered
    const existing = await Registration.findOne({
      where: {
        training_id,
        user_id: req.user.user_id,
        status: ['registered', 'waitlist']
      }
    });

    if (existing) {
      return res.status(400).json({ detail: 'Sie sind bereits für diese Fortbildung angemeldet' });
    }

    // Check deadlines
    const deadline = new Date(training.registration_deadline);
    if (new Date() > deadline) {
      return res.status(400).json({ detail: 'Die Anmeldefrist ist bereits abgelaufen' });
    }

    // Check capacity
    const currentCount = await Registration.count({
      where: { training_id, status: 'registered' }
    });

    let status = 'registered';
    if (currentCount >= training.max_participants) {
      status = 'waitlist';
    }

    const registration = await Registration.create({
      training_id,
      user_id: req.user.user_id,
      user_name: req.user.name,
      user_email: req.user.email,
      status,
      form_responses: form_responses || {},
      registered_at: new Date().toISOString()
    });

    // Send confirmation email
    const subject = status === 'registered' 
      ? `Anmeldebestätigung: ${training.title}`
      : `Wartelistenplatz: ${training.title}`;
      
    const textHtml = status === 'registered'
      ? `<h2>Anmeldung erfolgreich</h2><p>Sie sind erfolgreich für die Fortbildung "${training.title}" angemeldet.</p>`
      : `<h2>Warteliste</h2><p>Die Fortbildung "${training.title}" ist ausgebucht. Sie wurden auf die Warteliste gesetzt.</p>`;

    await sendEmail(req.user.email, subject, `<html><body>${textHtml}</body></html>`);

    res.status(201).json(registration);
  } catch (error) {
    console.error('Error creating registration:', error);
    res.status(500).json({ detail: 'Fehler bei der Anmeldung' });
  }
});

// DELETE /api/registrations/:registration_id
router.delete('/:registration_id', authenticateToken, async (req, res) => {
  const { registration_id } = req.params;

  try {
    const registration = await Registration.findOne({ where: { registration_id } });
    if (!registration) {
      return res.status(404).json({ detail: 'Anmeldung nicht gefunden' });
    }

    if (registration.user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Keine Berechtigung' });
    }

    const training = await Training.findOne({ where: { training_id: registration.training_id } });
    const oldStatus = registration.status;

    // Soft delete / cancel
    registration.status = 'cancelled';
    registration.cancelled_at = new Date().toISOString();
    await registration.save();

    // Clean up participations if confirmed
    const { Participation } = require('../models');
    await Participation.destroy({
      where: {
        training_id: registration.training_id,
        user_id: registration.user_id
      }
    });

    // Notify user of cancellation
    if (training) {
      await sendEmail(
        registration.user_email,
        `Abmeldung: ${training.title}`,
        `<html><body><h2>Abmeldung bestätigt</h2><p>Ihre Abmeldung für die Fortbildung "${training.title}" war erfolgreich.</p></body></html>`
      );

      // If they were registered, promote first user from waitlist
      if (oldStatus === 'registered') {
        const nextInWaitlist = await Registration.findOne({
          where: {
            training_id: registration.training_id,
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
    }

    res.json({ message: 'Abmeldung erfolgreich durchgeführt' });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({ detail: 'Fehler bei der Abmeldung' });
  }
});

module.exports = router;
