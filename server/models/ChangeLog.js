const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ChangeLog = sequelize.define('ChangeLog', {
  log_id: {
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
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  changes: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const val = this.getDataValue('changes');
      return val ? JSON.parse(val) : {};
    },
    set(val) {
      this.setDataValue('changes', JSON.stringify(val));
    }
  },
  created_at: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: false,
  tableName: 'change_logs'
});

module.exports = ChangeLog;
