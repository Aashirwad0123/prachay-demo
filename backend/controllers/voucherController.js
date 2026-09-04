const { Op } = require('sequelize');
const { Voucher, User } = require('../models');
const generateVoucherNumber = require('../utils/generateVoucherNumber');

const INCLUDE = [
  { model: User, as: 'employee', attributes: ['id', 'name', 'email', 'department'] },
  { model: User, as: 'approver', attributes: ['id', 'name', 'email'] },
];

function buildQueryOptions(query) {
  const where = {};
  const {
    search, voucherNumber, employeeName, department, category, status,
    dateFrom, dateTo, amountMin, amountMax, sortBy, order,
  } = query;

  if (search) {
    where[Op.or] = [
      { voucherNumber: { [Op.like]: `%${search}%` } },
      { employeeName: { [Op.like]: `%${search}%` } },
      { expenseTitle: { [Op.like]: `%${search}%` } },
      { departmentName: { [Op.like]: `%${search}%` } },
    ];
  }
  if (voucherNumber) where.voucherNumber = { [Op.like]: `%${voucherNumber}%` };
  if (employeeName) where.employeeName = { [Op.like]: `%${employeeName}%` };
  if (department) where.departmentName = { [Op.like]: `%${department}%` };
  if (category) where.expenseCategory = { [Op.like]: `%${category}%` };
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.expenseDate = {};
    if (dateFrom) where.expenseDate[Op.gte] = dateFrom;
    if (dateTo) where.expenseDate[Op.lte] = dateTo;
  }
  if (amountMin || amountMax) {
    where.amount = {};
    if (amountMin) where.amount[Op.gte] = amountMin;
    if (amountMax) where.amount[Op.lte] = amountMax;
  }

  const sortableFields = ['createdAt', 'amount', 'expenseDate', 'voucherNumber', 'status'];
  const sortField = sortableFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  return { where, order: [[sortField, sortOrder]] };
}

// EMPLOYEE — create (draft or submit)
exports.createVoucher = async (req, res, next) => {
  try {
    const {
      expenseDate, departmentName, expenseTitle, expenseCategory,
      expenseDescription, amount, employeeIdCode, submit,
    } = req.body;

    if (!expenseDate || !departmentName || !expenseTitle || !amount) {
      return res.status(400).json({ message: 'expenseDate, departmentName, expenseTitle and amount are required' });
    }
    if (Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount must be greater than 0' });
    }

    const isSubmit = submit === 'true' || submit === true;
    const signature = req.file ? req.file.filename : null;
    if (isSubmit && !signature) {
      return res.status(400).json({ message: 'Employee signature is required to submit a voucher' });
    }

    const voucher = await Voucher.create({
      voucherNumber: await generateVoucherNumber(),
      voucherDate: new Date().toISOString().slice(0, 10),
      expenseDate,
      departmentName,
      expenseTitle,
      expenseCategory,
      expenseDescription,
      amount,
      employeeUserId: req.user.id,
      employeeName: req.user.name,
      employeeIdCode: employeeIdCode || req.user.employeeId,
      employeeSignature: signature,
      status: isSubmit ? 'PENDING_APPROVAL' : 'DRAFT',
    });

    res.status(201).json(voucher);
  } catch (err) {
    next(err);
  }
};

// EMPLOYEE — edit (owner + DRAFT only)
exports.updateVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    if (voucher.employeeUserId !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this voucher' });
    }
    if (voucher.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only Draft vouchers can be edited' });
    }

    const {
      expenseDate, departmentName, expenseTitle, expenseCategory,
      expenseDescription, amount, employeeIdCode, submit,
    } = req.body;

    if (amount !== undefined && Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount must be greater than 0' });
    }

    const isSubmit = submit === 'true' || submit === true;
    const signature = req.file ? req.file.filename : voucher.employeeSignature;
    if (isSubmit && !signature) {
      return res.status(400).json({ message: 'Employee signature is required to submit a voucher' });
    }

    await voucher.update({
      expenseDate: expenseDate ?? voucher.expenseDate,
      departmentName: departmentName ?? voucher.departmentName,
      expenseTitle: expenseTitle ?? voucher.expenseTitle,
      expenseCategory: expenseCategory ?? voucher.expenseCategory,
      expenseDescription: expenseDescription ?? voucher.expenseDescription,
      amount: amount ?? voucher.amount,
      employeeIdCode: employeeIdCode ?? voucher.employeeIdCode,
      employeeSignature: signature,
      status: isSubmit ? 'PENDING_APPROVAL' : 'DRAFT',
    });

    res.json(voucher);
  } catch (err) {
    next(err);
  }
};

// EMPLOYEE — delete (owner + DRAFT only)
exports.deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    if (voucher.employeeUserId !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this voucher' });
    }
    if (voucher.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only Draft vouchers can be deleted' });
    }
    await voucher.destroy();
    res.json({ message: 'Voucher deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// EMPLOYEE — submit an existing Draft
exports.submitVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    if (voucher.employeeUserId !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this voucher' });
    }
    if (voucher.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only Draft vouchers can be submitted' });
    }
    if (!voucher.employeeSignature) {
      return res.status(400).json({ message: 'Employee signature is required before submission' });
    }
    await voucher.update({ status: 'PENDING_APPROVAL' });
    res.json(voucher);
  } catch (err) {
    next(err);
  }
};

// EMPLOYEE — own vouchers
exports.getMyVouchers = async (req, res, next) => {
  try {
    const { where, order } = buildQueryOptions(req.query);
    where.employeeUserId = req.user.id;
    const vouchers = await Voucher.findAll({ where, order, include: INCLUDE });
    res.json(vouchers);
  } catch (err) {
    next(err);
  }
};

// DIRECTOR — pending approvals
exports.getPendingVouchers = async (req, res, next) => {
  try {
    const { where, order } = buildQueryOptions(req.query);
    where.status = 'PENDING_APPROVAL';
    const vouchers = await Voucher.findAll({ where, order, include: INCLUDE });
    res.json(vouchers);
  } catch (err) {
    next(err);
  }
};

// DIRECTOR, ACCOUNTS — all vouchers
exports.getAllVouchers = async (req, res, next) => {
  try {
    const { where, order } = buildQueryOptions(req.query);
    const vouchers = await Voucher.findAll({ where, order, include: INCLUDE });
    res.json(vouchers);
  } catch (err) {
    next(err);
  }
};

// EMPLOYEE (own), DIRECTOR, ACCOUNTS — single voucher
exports.getVoucherById = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByPk(req.params.id, { include: INCLUDE });
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    if (req.user.role === 'EMPLOYEE' && voucher.employeeUserId !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this voucher' });
    }
    res.json(voucher);
  } catch (err) {
    next(err);
  }
};

// DIRECTOR — approve
exports.approveVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    if (voucher.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ message: 'Only vouchers Pending Approval can be approved' });
    }
    const directorSignature = req.file ? req.file.filename : voucher.directorSignature;
    if (!directorSignature) {
      return res.status(400).json({ message: 'Director signature is required to approve' });
    }
    await voucher.update({
      status: 'APPROVED',
      directorSignature,
      approvalDate: new Date(),
      approvedByUserId: req.user.id,
    });
    res.json(voucher);
  } catch (err) {
    next(err);
  }
};

// DIRECTOR — reject
exports.rejectVoucher = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ message: 'rejectionReason is required to reject a voucher' });
    }
    const voucher = await Voucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    if (voucher.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ message: 'Only vouchers Pending Approval can be rejected' });
    }
    await voucher.update({
      status: 'REJECTED',
      rejectionReason,
      approvalDate: new Date(),
      approvedByUserId: req.user.id,
    });
    res.json(voucher);
  } catch (err) {
    next(err);
  }
};
