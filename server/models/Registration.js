const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Registration = sequelize.define('Registration', {
  registration_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  training_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user_name: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  user_email: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'registered' // registered, waitlist, cancelled
  },
  form_responses: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const val = this.getDataValue('form_responses');
      return val ? JSON.parse(val) : {};
    },
    set(val) {
      this.setDataValue('form_responses', JSON.stringify(val));
    }
  },
  registered_at: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cancelled_at: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: false,
  tableName: 'registrations'
});

module.exports = Registration;
