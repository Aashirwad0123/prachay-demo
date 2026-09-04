const { z } = require('zod');
const { password: pw, stringLimits } = require('../config/security');

const email = z.string().trim().toLowerCase().max(stringLimits.email).email('Enter a valid email address (e.g. name@gmail.com)');

// Public registration: role is intentionally NOT accepted here.
// Privileged roles are assigned only via an authorized admin process (see README).
const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(stringLimits.name),
    email,
    password: z
      .string()
      .min(pw.minLength, `Password must be at least ${pw.minLength} characters`)
      .max(pw.maxLength, `Password must be at most ${pw.maxLength} characters`)
      .regex(pw.complexity, 'Password must include an uppercase letter, a lowercase letter, a number, and a special character'),
    employeeId: z.string().trim().max(50).optional(),
    department: z.string().trim().max(100).optional(),
  })
  .strict();

// Login only checks credentials against what's already stored - it must keep accepting
// any password created under an older/different policy, so no complexity check here.
const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Password is required').max(pw.maxLength),
  })
  .strict();

module.exports = { registerSchema, loginSchema };
