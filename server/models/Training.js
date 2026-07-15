const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Training = sequelize.define('Training', {
  training_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  requirements: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  materials: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dates: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('dates');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('dates', JSON.stringify(val));
    }
  },
  max_participants: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  registration_deadline: {
    type: DataTypes.STRING,
    allowNull: false
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: false
  },
  created_by_name: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'draft' // draft or published
  },
  form_fields: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('form_fields');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('form_fields', JSON.stringify(val));
    }
  },
  created_at: {
    type: DataTypes.STRING,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: false,
  tableName: 'trainings'
});

module.exports = Training;
