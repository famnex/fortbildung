const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  // LDAP Settings
  ldap_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ldap_server: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  ldap_port: {
    type: DataTypes.INTEGER,
    defaultValue: 389
  },
  ldap_use_ssl: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ldap_base_dn: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  ldap_bind_dn: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  ldap_bind_password: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  ldap_group_filter: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  ldap_user_attr: {
    type: DataTypes.STRING,
    defaultValue: 'sAMAccountName'
  },
  ldap_mail_attr: {
    type: DataTypes.STRING,
    defaultValue: 'mail'
  },
  ldap_display_attr: {
    type: DataTypes.STRING,
    defaultValue: 'displayName'
  },
  ldap_upn_suffix: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  // SMTP Settings
  smtp_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  smtp_server: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  smtp_port: {
    type: DataTypes.INTEGER,
    defaultValue: 587
  },
  smtp_username: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  smtp_password: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  smtp_from_email: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  smtp_from_name: {
    type: DataTypes.STRING,
    defaultValue: 'MSO Fortbildungssystem'
  },
  smtp_use_tls: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // JWT SSO Settings
  jwt_sso_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  jwt_sso_secret: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  // School Info
  school_name: {
    type: DataTypes.STRING,
    defaultValue: 'MSO - Fortbildungssystem'
  },
  school_logo_base64: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  timestamps: false,
  tableName: 'settings'
});

module.exports = Setting;
