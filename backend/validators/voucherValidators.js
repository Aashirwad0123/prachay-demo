const { z } = require('zod');
const { stringLimits, amount: amountCfg, pagination } = require('../config/security');

const dateOnly = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date (YYYY-MM-DD)');
const amount = z.coerce
  .number({ invalid_type_error: 'Amount must be numeric' })
  .gt(0, 'Amount must be greater than 0')
  .max(amountCfg.max, `Amount exceeds the maximum allowed (${amountCfg.max})`);
const submitFlag = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .optional()
  .transform((v) => v === true || v === 'true');

// multipart/form-data delivers every field as a string, so required-ness is checked
// at the controller (create requires them present); here we validate shape/limits.
const createVoucherSchema = z
  .object({
    expenseDate: dateOnly,
    departmentName: z.string().trim().min(1, 'Department is required').max(stringLimits.departmentName),
    expenseTitle: z.string().trim().min(1, 'Expense title is required').max(stringLimits.expenseTitle),
    expenseCategory: z.string().trim().max(stringLimits.expenseCategory).optional().or(z.literal('')),
    expenseDescription: z.string().trim().max(stringLimits.expenseDescription).optional().or(z.literal('')),
    amount,
    employeeIdCode: z.string().trim().max(stringLimits.employeeIdCode).optional().or(z.literal('')),
    submit: submitFlag,
  })
  .strict();

const updateVoucherSchema = z
  .object({
    expenseDate: dateOnly.optional(),
    departmentName: z.string().trim().min(1).max(stringLimits.departmentName).optional(),
    expenseTitle: z.string().trim().min(1).max(stringLimits.expenseTitle).optional(),
    expenseCategory: z.string().trim().max(stringLimits.expenseCategory).optional().or(z.literal('')),
    expenseDescription: z.string().trim().max(stringLimits.expenseDescription).optional().or(z.literal('')),
    amount: amount.optional(),
    employeeIdCode: z.string().trim().max(stringLimits.employeeIdCode).optional().or(z.literal('')),
    submit: submitFlag,
  })
  .strict();

const rejectSchema = z
  .object({
    rejectionReason: z.string().trim().min(1, 'rejectionReason is required to reject a voucher').max(stringLimits.rejectionReason),
  })
  .strict();

const SORTABLE_FIELDS = ['createdAt', 'amount', 'expenseDate', 'voucherNumber', 'status'];
const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

const idParamSchema = z
  .object({ id: z.coerce.number().int().positive('Invalid id') })
  .passthrough(); // route params object may carry other matched segments

const listQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    voucherNumber: z.string().trim().max(50).optional(),
    employeeName: z.string().trim().max(stringLimits.name).optional(),
    department: z.string().trim().max(stringLimits.departmentName).optional(),
    category: z.string().trim().max(stringLimits.expenseCategory).optional(),
    status: z.enum(STATUSES).optional(),
    dateFrom: dateOnly.optional(),
    dateTo: dateOnly.optional(),
    amountMin: z.coerce.number().nonnegative().optional(),
    amountMax: z.coerce.number().nonnegative().optional(),
    sortBy: z.enum(SORTABLE_FIELDS).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(pagination.maxLimit).optional(),
  })
  .strict();

module.exports = {
  createVoucherSchema,
  updateVoucherSchema,
  rejectSchema,
  idParamSchema,
  listQuerySchema,
  SORTABLE_FIELDS,
};
