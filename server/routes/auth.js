const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Setting } = require('../models');
const { authenticateToken, SECRET_KEY } = require('../middleware/auth');
const { authenticateLDAP } = require('../utils/ldap');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ detail: 'E-Mail-Adresse und Passwort erforderlich' });
  }

  try {
    // 1. Try local authentication
    let user = await User.findOne({ where: { email, auth_source: 'local' } });
    if (user && bcrypt.compareSync(password, user.password_hash)) {
      user.last_login = new Date().toISOString();
      await user.save();
      
      const token = jwt.sign({ sub: user.user_id }, SECRET_KEY, { expiresIn: '7d' });
      const userJSON = user.toJSON();
      delete userJSON.password_hash;
      
      return res.json({ token, user: userJSON });
    }

    // 2. Try LDAP authentication
    const settings = await Setting.findOne();
    if (settings && settings.ldap_enabled) {
      const ldapUser = await authenticateLDAP(settings, email, password);
      if (ldapUser) {
        let existingUser = await User.findOne({ where: { email: ldapUser.email, auth_source: 'ldap' } });
        if (!existingUser) {
          existingUser = await User.create({
            email: ldapUser.email,
            name: ldapUser.name,
            role: 'user',
            auth_source: 'ldap',
            created_at: new Date().toISOString()
          });
        }
        
        existingUser.last_login = new Date().toISOString();
        await existingUser.save();

        const token = jwt.sign({ sub: existingUser.user_id }, SECRET_KEY, { expiresIn: '7d' });
        const userJSON = existingUser.toJSON();
        delete userJSON.password_hash;
        
        return res.json({ token, user: userJSON });
      }
    }

    return res.status(401).json({ detail: 'Ungültige Anmeldedaten' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ detail: 'Serverfehler beim Login' });
  }
});

// POST /api/auth/login-jwt
router.post('/login-jwt', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    console.log('JWT SSO Login: Missing token in body.');
    return res.status(400).json({ detail: 'Token erforderlich' });
  }

  try {
    const settings = await Setting.findOne();
    if (!settings || !settings.jwt_sso_enabled) {
      console.log('JWT SSO Login: JWT SSO is not enabled in settings.');
      return res.status(400).json({ detail: 'JWT SSO ist nicht aktiviert' });
    }

    const ssoSecret = settings.jwt_sso_secret;
    if (!ssoSecret) {
      console.log('JWT SSO Login: Secret key is not configured in settings.');
      return res.status(500).json({ detail: 'JWT SSO Secret ist nicht konfiguriert' });
    }

    // Decode and verify the external token
    let payload;
    try {
      payload = jwt.verify(token, ssoSecret);
      console.log('JWT SSO Login: Decoded payload:', JSON.stringify(payload, null, 2));
    } catch (err) {
      console.log('JWT SSO Login: Token verification failed:', err.message);
      return res.status(401).json({ detail: 'Ungültiges Token' });
    }

    const email = payload.email || payload.sub;
    let name = payload.display_name || payload.displayName || payload.displayname || payload.name || payload.cn || payload.username || email;

    // Resolve name from LDAP if is_ldap is true
    if (payload.is_ldap && payload.username && settings && settings.ldap_enabled) {
      const { getLDAPUserDisplayName } = require('../utils/ldap');
      const ldapName = await getLDAPUserDisplayName(settings, payload.username);
      if (ldapName) {
        name = ldapName;
        console.log(`JWT SSO Login: Resolved display name from LDAP: ${ldapName}`);
      }
    }

    if (!email) {
      console.log('JWT SSO Login: Email not found in token payload:', payload);
      return res.status(400).json({ detail: 'E-Mail-Adresse im Token nicht gefunden' });
    }

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        email,
        name,
        role: 'user',
        auth_source: 'jwt',
        created_at: new Date().toISOString()
      });
      console.log(`User automatically created via JWT login: ${email}`);
    } else {
      user.name = name;
      user.last_login = new Date().toISOString();
      await user.save();
      console.log(`User merged/logged in via JWT: ${email}`);
    }

    // Generate local session token
    const sessionToken = jwt.sign({ sub: user.user_id }, SECRET_KEY, { expiresIn: '7d' });
    const userJSON = user.toJSON();
    delete userJSON.password_hash;
    
    return res.json({ token: sessionToken, user: userJSON });
  } catch (error) {
    console.error('JWT Login error:', error);
    return res.status(500).json({ detail: 'Serverfehler beim JWT SSO' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = { ...req.user };
  delete user.password_hash;
  res.json(user);
});

// GET /api/auth/login-config (Public endpoint)
router.get('/login-config', async (req, res) => {
  try {
    const settings = await Setting.findOne();
    const ldapEnabled = settings ? settings.ldap_enabled : false;
    const jwtSsoEnabled = settings ? settings.jwt_sso_enabled : false;
    const ssoLoginUrl = settings ? settings.jwt_sso_url : '';

    const nonLocalAdmin = await User.findOne({
      where: {
        role: 'admin',
        auth_source: {
          [require('sequelize').Op.ne]: 'local'
        }
      }
    });

    res.json({
      sso_or_ldap_active: ldapEnabled || jwtSsoEnabled,
      non_local_admin_exists: !!nonLocalAdmin,
      sso_login_url: ssoLoginUrl || ''
    });
  } catch (error) {
    console.error('Error fetching login config:', error);
    res.status(500).json({ detail: 'Fehler beim Laden der Login-Konfiguration' });
  }
});

module.exports = router;
