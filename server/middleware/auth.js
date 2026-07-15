const jwt = require('jsonwebtoken');
const { User } = require('../models');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ detail: 'Token erforderlich' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findOne({ where: { user_id: decoded.sub } });
    
    if (!user) {
      return res.status(401).json({ detail: 'Benutzer nicht gefunden' });
    }

    req.user = user.toJSON();
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token abgelaufen' });
    }
    return res.status(401).json({ detail: 'Ungültiges Token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Admin-Rechte erforderlich' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  SECRET_KEY
};
