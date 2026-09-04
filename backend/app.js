require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

const authRoutes = require('./routes/authRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const requestId = require('./middleware/requestId');
const logger = require('./middleware/logger');
const { apiLimiter } = require('./middleware/rateLimit');
const { body: bodyCfg } = require('./config/security');

if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
  throw new Error('CLIENT_URL must be set in production - refusing to fall back to a wildcard CORS origin');
}

const app = express();

app.use(requestId);
app.use(logger);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: bodyCfg.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyCfg.jsonLimit }));
app.use('/api', apiLimiter);

// Signature files are no longer served by unauthenticated static middleware -
// see GET /api/vouchers/:id/signature, which requires auth + ownership.

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 2MB size limit' : err.message;
    return res.status(400).json({ message });
  }
  if (err.message?.includes('images are allowed') || err.type === 'entity.too.large') {
    const status = err.type === 'entity.too.large' ? 413 : 400;
    return res.status(status).json({ message: err.type === 'entity.too.large' ? 'Request body too large' : err.message });
  }
  console.error(JSON.stringify({ requestId: req.id, error: err.message, stack: err.stack }));
  // Production never gets a stack trace or internal error detail - only a generic
  // message plus the request ID, which an operator can correlate against server logs.
  res.status(500).json({ message: 'Internal server error', requestId: req.id });
});

module.exports = app;
