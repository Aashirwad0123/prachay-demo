const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwt: jwtCfg } = require('../config/security');

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: [jwtCfg.algorithm] });
    // The token only carries an id - role/authorization always comes from a fresh DB read,
    // never from the token payload, so a stale/forged claim in the token can't grant access.
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { protect, authorize };
