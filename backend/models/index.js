const sequelize = require('../config/db');
const User = require('./User');
const Voucher = require('./Voucher');

module.exports = { sequelize, User, Voucher };
