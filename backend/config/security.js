const num = (v, fallback) => (v !== undefined && v !== '' ? Number(v) : fallback);

module.exports = {
  jwt: {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  password: {
    minLength: 8,
    maxLength: 72, // bcrypt truncates/ignores bytes beyond 72
    // at least one lowercase, one uppercase, one digit, one special character
    complexity: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
  },
  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: num(process.env.RATE_LIMIT_MAX, 100),
    authMax: num(process.env.AUTH_RATE_LIMIT_MAX, 10),
  },
  body: {
    jsonLimit: '100kb',
  },
  upload: {
    maxFileSize: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  amount: {
    max: 10_000_000,
  },
  stringLimits: {
    name: 100,
    email: 254,
    departmentName: 100,
    expenseTitle: 150,
    expenseCategory: 100,
    expenseDescription: 2000,
    employeeIdCode: 50,
    rejectionReason: 1000,
  },
};
