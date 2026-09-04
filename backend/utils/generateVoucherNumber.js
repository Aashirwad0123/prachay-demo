const { Voucher } = require('../models');
const { Op } = require('sequelize');

async function generateVoucherNumber() {
  const year = new Date().getFullYear();
  const prefix = `EV-${year}-`;
  const count = await Voucher.count({
    where: { voucherNumber: { [Op.like]: `${prefix}%` } },
  });
  const next = String(count + 1).padStart(5, '0');
  return `${prefix}${next}`;
}

module.exports = generateVoucherNumber;
