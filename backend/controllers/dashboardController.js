const { Op } = require('sequelize');
const { Voucher } = require('../models');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

exports.employeeDashboard = async (req, res, next) => {
  try {
    const where = { employeeUserId: req.user.id };
    const vouchers = await Voucher.findAll({ where });
    const sum = (list) => list.reduce((s, v) => s + Number(v.amount), 0);

    res.json({
      totalVouchers: vouchers.length,
      draftVouchers: vouchers.filter((v) => v.status === 'DRAFT').length,
      pendingApproval: vouchers.filter((v) => v.status === 'PENDING_APPROVAL').length,
      approvedVouchers: vouchers.filter((v) => v.status === 'APPROVED').length,
      rejectedVouchers: vouchers.filter((v) => v.status === 'REJECTED').length,
      totalAmountClaimed: sum(vouchers),
    });
  } catch (err) {
    next(err);
  }
};

exports.directorDashboard = async (req, res, next) => {
  try {
    const today = startOfToday();
    const pending = await Voucher.findAll({ where: { status: 'PENDING_APPROVAL' } });
    const approvedToday = await Voucher.count({
      where: { status: 'APPROVED', approvalDate: { [Op.gte]: today } },
    });
    const rejectedToday = await Voucher.count({
      where: { status: 'REJECTED', approvalDate: { [Op.gte]: today } },
    });
    const recentActivity = await Voucher.findAll({
      order: [['updatedAt', 'DESC']],
      limit: 10,
    });

    res.json({
      pendingApprovalCount: pending.length,
      approvedToday,
      rejectedToday,
      totalPendingAmount: pending.reduce((s, v) => s + Number(v.amount), 0),
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
};

exports.accountsDashboard = async (req, res, next) => {
  try {
    const all = await Voucher.findAll();
    const approved = all.filter((v) => v.status === 'APPROVED');
    const recentApprovedVouchers = await Voucher.findAll({
      where: { status: 'APPROVED' },
      order: [['approvalDate', 'DESC']],
      limit: 10,
    });

    res.json({
      totalVouchers: all.length,
      pendingApproval: all.filter((v) => v.status === 'PENDING_APPROVAL').length,
      approvedVouchers: approved.length,
      rejectedVouchers: all.filter((v) => v.status === 'REJECTED').length,
      totalApprovedExpenseAmount: approved.reduce((s, v) => s + Number(v.amount), 0),
      recentApprovedVouchers,
    });
  } catch (err) {
    next(err);
  }
};
