const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Participation = sequelize.define('Participation', {
  participation_id: {
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
  confirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  certificate_generated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  confirmed_at: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: false,
  tableName: 'participations'
});

module.exports = Participation;
