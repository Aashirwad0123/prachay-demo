const rateLimit = require('express-rate-limit');
const { rateLimit: cfg } = require('../config/security');

const handler = (req, res) => {
  res.status(429).json({ message: 'Too many requests. Please try again later.' });
};

const apiLimiter = rateLimit({
  windowMs: cfg.windowMs,
  max: cfg.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Applies to /auth/login and /auth/register - keyed by IP, not by email,
// so it can't be used to fingerprint whether a given email exists.
const authLimiter = rateLimit({
  windowMs: cfg.windowMs,
  max: cfg.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = { apiLimiter, authLimiter };
