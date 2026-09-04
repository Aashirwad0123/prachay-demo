process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_only_secret_do_not_use_in_prod_12345';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
// High limits here so the functional test suite (many logins/requests) never trips a
// limiter by accident - the dedicated rate-limit behavior is covered in its own test
// file (test/rateLimit.test.js), which sets its own low limits before requiring app.js.
process.env.RATE_LIMIT_MAX = '5000';
process.env.AUTH_RATE_LIMIT_MAX = '5000';
