const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// GET /api/users
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der Benutzer' });
  }
});

// POST /api/users
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { email, name, password, role } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ detail: 'E-Mail-Adresse, Name und Passwort erforderlich' });
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ detail: 'E-Mail-Adresse bereits vergeben' });
    }

    const newUser = await User.create({
      email,
      name,
      password_hash: bcrypt.hashSync(password, 10),
      role: role || 'user',
      auth_source: 'local',
      created_at: new Date().toISOString()
    });

    const userJSON = newUser.toJSON();
    delete userJSON.password_hash;
    res.status(201).json(userJSON);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ detail: 'Fehler beim Erstellen des Benutzers' });
  }
});

// PUT /api/users/:user_id
router.put('/:user_id', authenticateToken, requireAdmin, async (req, res) => {
  const { user_id } = req.params;
  const { email, name, password, role } = req.body;

  try {
    const user = await User.findOne({ where: { user_id } });
    if (!user) {
      return res.status(404).json({ detail: 'Benutzer nicht gefunden' });
    }

    if (user.auth_source === 'ldap') {
      return res.status(400).json({ detail: 'LDAP-Benutzer können nicht bearbeitet werden' });
    }

    const updateData = {};
    if (email) {
      const existing = await User.findOne({ where: { email, user_id: { [Op.ne]: user_id } } });
      if (existing) {
        return res.status(400).json({ detail: 'E-Mail-Adresse bereits vergeben' });
      }
      updateData.email = email;
    }

    if (name) updateData.name = name;
    if (role) {
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ detail: 'Ungültige Rolle' });
      }
      updateData.role = role;
    }
    if (password) {
      updateData.password_hash = bcrypt.hashSync(password, 10);
    }

    await user.update(updateData);
    res.json({ message: 'Benutzer erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ detail: 'Fehler beim Aktualisieren des Benutzers' });
  }
});

// DELETE /api/users/:user_id
router.delete('/:user_id', authenticateToken, requireAdmin, async (req, res) => {
  const { user_id } = req.params;

  if (user_id === req.user.user_id) {
    return res.status(400).json({ detail: 'Sie können sich nicht selbst löschen' });
  }

  try {
    const user = await User.findOne({ where: { user_id } });
    if (!user) {
      return res.status(404).json({ detail: 'Benutzer nicht gefunden' });
    }

    if (user.auth_source === 'ldap') {
      return res.status(400).json({ detail: 'LDAP-Benutzer können nicht gelöscht werden' });
    }

    await user.destroy();
    res.json({ message: 'Benutzer erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ detail: 'Fehler beim Löschen des Benutzers' });
  }
});

// PUT /api/users/:user_id/role
router.put('/:user_id/role', authenticateToken, requireAdmin, async (req, res) => {
  const { user_id } = req.params;
  const { role } = req.body;

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ detail: 'Ungültige Rolle' });
  }

  try {
    const user = await User.findOne({ where: { user_id } });
    if (!user) {
      return res.status(404).json({ detail: 'Benutzer nicht gefunden' });
    }

    user.role = role;
    await user.save();
    res.json({ message: 'Benutzerrolle erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ detail: 'Fehler beim Aktualisieren der Benutzerrolle' });
  }
});

module.exports = router;
