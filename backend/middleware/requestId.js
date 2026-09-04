const crypto = require('crypto');

module.exports = function requestId(req, res, next) {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};
