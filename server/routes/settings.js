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

// POST /api/settings/update (Streaming route)
router.post('/update', authenticateToken, requireAdmin, (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const repoDir = path.resolve(__dirname, '../../');
  const updateBat = path.join(repoDir, 'update.bat');
  
  res.write('=== System Update gestartet ===\n');
  res.write(`Verzeichnis: ${repoDir}\n`);
  
  let cmd, args;
  if (fs.existsSync(updateBat)) {
    res.write("Benutzerdefiniertes Update-Skript 'update.bat' gefunden.\n");
    cmd = 'cmd.exe';
    args = ['/c', 'update.bat'];
  } else {
    res.write("Standard-Update-Prozess wird ausgeführt (keine 'update.bat' vorhanden).\n");
    cmd = 'git';
    args = ['pull'];
  }
  
  res.write(`\n> Führe aus: {cmd} ${args.join(' ')}\n\n`);
  
  const process = spawn(cmd, args, { cwd: repoDir, shell: true });
  
  process.stdout.on('data', (data) => {
    res.write(data);
  });
  
  process.stderr.on('data', (data) => {
    res.write(`[FEHLER] ${data}`);
  });
  
  process.on('close', (code) => {
    res.write(`\nBefehl beendet mit Code: ${code}\n`);
    
    // Fallback behavior if standard pull succeeds
    if (code === 0 && !fs.existsSync(updateBat)) {
      res.write('\nStandard-Pip-Installationen werden nach Git-Pull ausgeführt...\n');
      const pip = spawn('python', ['-m', 'pip', 'install', '-r', 'backend/requirements.txt'], { cwd: repoDir, shell: true });
      
      pip.stdout.on('data', (data) => res.write(data));
      pip.stderr.on('data', (data) => res.write(`[FEHLER] ${data}`));
      pip.on('close', (pipCode) => {
        res.write(`\nBefehl beendet mit Code: ${pipCode}\n`);
        if (pipCode === 0) {
          res.write('\n=== UPDATE ERFOLGREICH BEENDET ===\n');
        } else {
          res.write('\n=== UPDATE ABGEBROCHEN wegen Fehler ===\n');
        }
        res.end();
      });
    } else {
      if (code === 0) {
        res.write('\n=== UPDATE ERFOLGREICH BEENDET ===\n');
      } else {
        res.write('\n=== UPDATE ABGEBROCHEN wegen Fehler ===\n');
      }
      res.end();
    }
  });
});

module.exports = router;
