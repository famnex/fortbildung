const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user' // admin or user
  },
  auth_source: {
    type: DataTypes.STRING,
    defaultValue: 'local' // local, ldap, jwt
  },
  created_at: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_login: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: false,
  tableName: 'users'
});

module.exports = User;
