const sequelize = require('../db');
const User = require('./User');
const Setting = require('./Setting');
const Training = require('./Training');
const Registration = require('./Registration');
const Participation = require('./Participation');
const ChangeLog = require('./ChangeLog');

module.exports = {
  sequelize,
  User,
  Setting,
  Training,
  Registration,
  Participation,
  ChangeLog
};
