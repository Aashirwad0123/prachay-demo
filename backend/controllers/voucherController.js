const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { Voucher, User } = require('../models');
const generateVoucherNumber = require('../utils/generateVoucherNumber');
const { pagination: paginationCfg } = require('../config/security');

const INCLUDE = [
  { model: User, as: 'employee', attributes: ['id', 'name', 'email', 'department'] },
  { model: User, as: 'approver', attributes: ['id', 'name', 'email'] },
];

const SIGNATURE_DIR = path.join(__dirname, '..', 'uploads', 'signatures');
const MIME_BY_EXT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

// req.query has already passed listQuerySchema (route-level validate middleware), so
// sortBy/order/page/limit are guaranteed to be one of the allowed values or undefined.
function buildQueryOptions(query) {
  const where = {};
  const {
    search, voucherNumber, employeeName, department, category, status,
    dateFrom, dateTo, amountMin, amountMax, sortBy, order, page, limit,
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

  const effectiveLimit = Math.min(limit || paginationCfg.defaultLimit, paginationCfg.maxLimit);
  const effectivePage = page || 1;

  return {
    where,
    order: [[sortBy || 'createdAt', (order || 'desc').toUpperCase()]],
    limit: effectiveLimit,
    offset: (effectivePage - 1) * effectiveLimit,
  };
}

// EMPLOYEE — create (draft or submit)
exports.createVoucher = async (req, res, next) => {
  try {
    const {
      expenseDate, departmentName, expenseTitle, expenseCategory,
      expenseDescription, amount, employeeIdCode, submit,
    } = req.body;

    const signature = req.file ? req.file.filename : null;
    if (submit && !signature) {
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
      status: submit ? 'PENDING_APPROVAL' : 'DRAFT',
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

    const signature = req.file ? req.file.filename : voucher.employeeSignature;
    if (submit && !signature) {
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
      status: submit ? 'PENDING_APPROVAL' : 'DRAFT',
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
    const { where, order, limit, offset } = buildQueryOptions(req.query);
    where.employeeUserId = req.user.id;
    const vouchers = await Voucher.findAll({ where, order, limit, offset, include: INCLUDE });
    res.json(vouchers);
  } catch (err) {
    next(err);
  }
};

// DIRECTOR — pending approvals
exports.getPendingVouchers = async (req, res, next) => {
  try {
    const { where, order, limit, offset } = buildQueryOptions(req.query);
    where.status = 'PENDING_APPROVAL';
    const vouchers = await Voucher.findAll({ where, order, limit, offset, include: INCLUDE });
    res.json(vouchers);
  } catch (err) {
    next(err);
  }
};

// DIRECTOR, ACCOUNTS — all vouchers
exports.getAllVouchers = async (req, res, next) => {
  try {
    const { where, order, limit, offset } = buildQueryOptions(req.query);
    const vouchers = await Voucher.findAll({ where, order, limit, offset, include: INCLUDE });
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

// EMPLOYEE (own), DIRECTOR, ACCOUNTS — stream a signature image.
// Filenames are never taken from the request - only ?type selects which DB column to
// read, so there is no path-traversal surface, and access requires the same
// authentication + ownership rule as reading the voucher itself.
exports.getSignature = async (req, res, next) => {
  try {
    const type = req.query.type === 'director' ? 'director' : 'employee';
    const voucher = await Voucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    if (req.user.role === 'EMPLOYEE' && voucher.employeeUserId !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this voucher' });
    }

    const filename = type === 'director' ? voucher.directorSignature : voucher.employeeSignature;
    if (!filename) return res.status(404).json({ message: 'Signature not found' });

    const filePath = path.join(SIGNATURE_DIR, filename);
    if (!filePath.startsWith(SIGNATURE_DIR) || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Signature not found' });
    }

    res.setHeader('Content-Type', MIME_BY_EXT[path.extname(filename).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};
