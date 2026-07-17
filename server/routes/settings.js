const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const multer = require('multer');
const { Setting } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { authenticateLDAP } = require('../utils/ldap');
const nodemailer = require('nodemailer');

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB limit

// GET /api/settings
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der Einstellungen' });
  }
});

// PUT /api/settings
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create(req.body);
    } else {
      await settings.update(req.body);
    }
    res.json({ message: 'Einstellungen erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ detail: 'Fehler beim Speichern der Einstellungen' });
  }
});

// POST /api/settings/upload-logo
router.post('/upload-logo', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'Keine Datei hochgeladen' });
  }

  try {
    const base64Image = req.file.buffer.toString('base64');
    const logoData = `data:${req.file.mimetype};base64,${base64Image}`;

    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({ school_logo_base64: logoData });
    } else {
      settings.school_logo_base64 = logoData;
      await settings.save();
    }

    res.json({ message: 'Logo erfolgreich hochgeladen', logo: logoData });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ detail: 'Fehler beim Hochladen des Logos' });
  }
});

// POST /api/settings/test-ldap
router.post('/test-ldap', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ detail: 'Benutzername und Passwort erforderlich' });
  }

  try {
    const settings = await Setting.findOne();
    if (!settings || !settings.ldap_enabled) {
      return res.status(400).json({ detail: 'LDAP ist nicht aktiviert' });
    }

    const ldapUser = await authenticateLDAP(settings, username, password);
    if (ldapUser) {
      return res.json({
        success: true,
        message: 'LDAP-Verbindung erfolgreich',
        user_data: {
          email: ldapUser.email,
          name: ldapUser.name
        }
      });
    } else {
      return res.json({
        success: false,
        message: 'Authentifizierung fehlgeschlagen - ungültige Anmeldedaten'
      });
    }
  } catch (error) {
    console.error('LDAP test error:', error);
    res.json({ success: false, message: `Fehler: ${error.message}` });
  }
});

// POST /api/settings/test-smtp
router.post('/test-smtp', authenticateToken, requireAdmin, async (req, res) => {
  const { email } = req.body;
  const targetEmail = email || req.user.email;

  if (!targetEmail) {
    return res.status(400).json({ detail: 'Test-E-Mail-Adresse erforderlich' });
  }

  try {
    const settings = await Setting.findOne();
    if (!settings || !settings.smtp_enabled) {
      return res.status(400).json({ detail: 'SMTP ist nicht aktiviert' });
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtp_server,
      port: settings.smtp_port,
      secure: settings.smtp_port === 465,
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const fromName = settings.smtp_from_name || 'MSO';
    await transporter.sendMail({
      from: `"${fromName}" <${settings.smtp_from_email}>`,
      to: targetEmail,
      subject: 'Test-E-Mail vom Fortbildungssystem',
      html: `<html><body>
        <h2>Test-E-Mail erfolgreich!</h2>
        <p>Diese E-Mail bestätigt, dass Ihre SMTP-Konfiguration korrekt ist.</p>
        <p>Mit freundlichen Grüßen,<br>Ihr Fortbildungssystem</p>
        </body></html>`
    });

    res.json({
      success: true,
      message: `Test-E-Mail erfolgreich an ${targetEmail} gesendet`
    });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.json({ success: false, message: `Fehler: ${error.message}` });
  }
});

const statusFile = path.join(__dirname, '../update_status.json');

// Helper to get update state
function getUpdateState() {
  try {
    if (fs.existsSync(statusFile)) {
      return JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading update status file:', e);
  }
  return { status: 'idle', logs: '' };
}

// Helper to save update state
function saveUpdateState(state) {
  try {
    fs.writeFileSync(statusFile, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Error writing update status file:', e);
  }
}

// GET /api/settings/update-status
router.get('/update-status', authenticateToken, requireAdmin, (req, res) => {
  res.json(getUpdateState());
});

// POST /api/settings/update-system
router.post('/update-system', authenticateToken, requireAdmin, (req, res) => {
  const state = getUpdateState();
  if (state.status === 'running') {
    return res.status(400).json({ detail: 'Ein Update wird bereits ausgeführt.' });
  }

  const newState = {
    status: 'running',
    logs: '==============================================\nSystem-Update gestartet...\n==============================================\n'
  };
  saveUpdateState(newState);

  // Spawn the update script in the background
  const repoDir = path.resolve(__dirname, '../../');
  const isWin = process.platform === 'win32';
  const scriptPath = isWin
    ? path.join(repoDir, 'update.bat')
    : path.join(repoDir, 'update.sh');

  const cmd = isWin ? scriptPath : 'bash';
  const args = isWin ? [] : [scriptPath];

  console.log(`Starting system update in background: ${cmd} ${args.join(' ')}`);

  const child = spawn(cmd, args, {
    cwd: repoDir,
    shell: true,
    env: process.env
  });

  child.stdout.on('data', (data) => {
    const currentState = getUpdateState();
    currentState.logs += data.toString();
    saveUpdateState(currentState);
  });

  child.stderr.on('data', (data) => {
    const currentState = getUpdateState();
    currentState.logs += `[FEHLER] ${data.toString()}`;
    saveUpdateState(currentState);
  });

  child.on('close', (code) => {
    const currentState = getUpdateState();
    if (code === 0) {
      currentState.status = 'success';
      currentState.logs += '\n==============================================\nUpdate ERFOLGREICH BEENDET!\n==============================================\n';
    } else {
      currentState.status = 'failed';
      currentState.logs += `\n==============================================\nUpdate FEHLGESCHLAGEN mit Code: ${code}\n==============================================\n`;
    }
    saveUpdateState(currentState);
  });

  res.json({ message: 'Update im Hintergrund gestartet', status: 'running' });
});

module.exports = router;
