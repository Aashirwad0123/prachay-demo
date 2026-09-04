const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Voucher = sequelize.define('Voucher', {
  voucherNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  voucherDate: { type: DataTypes.DATEONLY, allowNull: false },
  expenseDate: { type: DataTypes.DATEONLY, allowNull: false },
  departmentName: { type: DataTypes.STRING, allowNull: false },
  expenseTitle: { type: DataTypes.STRING, allowNull: false },
  expenseCategory: { type: DataTypes.STRING, allowNull: true },
  expenseDescription: { type: DataTypes.TEXT, allowNull: true },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0.01, max: 10000000 },
  },
  employeeUserId: { type: DataTypes.INTEGER, allowNull: false },
  employeeName: { type: DataTypes.STRING, allowNull: false },
  employeeIdCode: { type: DataTypes.STRING, allowNull: true },
  employeeSignature: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'),
    allowNull: false,
    defaultValue: 'DRAFT',
  },
  directorSignature: { type: DataTypes.STRING, allowNull: true },
  approvalDate: { type: DataTypes.DATE, allowNull: true },
  rejectionReason: { type: DataTypes.TEXT, allowNull: true },
  approvedByUserId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  indexes: [
    { fields: ['employeeUserId'] },
    { fields: ['status'] },
  ],
});

Voucher.belongsTo(User, { as: 'employee', foreignKey: 'employeeUserId' });
Voucher.belongsTo(User, { as: 'approver', foreignKey: 'approvedByUserId' });

module.exports = Voucher;
