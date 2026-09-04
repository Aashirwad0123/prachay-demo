const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwt: jwtCfg } = require('../config/security');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    algorithm: jwtCfg.algorithm,
    expiresIn: jwtCfg.expiresIn,
  });
}

exports.register = async (req, res, next) => {
  try {
    // req.body is already validated/typed by the registerSchema middleware, which does
    // not accept a `role` field at all - public registration always creates an EMPLOYEE.
    // Privileged roles (DIRECTOR, ACCOUNTS) are only ever set by utils/seed.js or a
    // direct DB operation, never through this endpoint.
    const { name, email, password, employeeId, department } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hash,
      role: 'EMPLOYEE',
      employeeId,
      department,
    });

    res.status(201).json({
      token: signToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Incorrect email or password. Please check and try again.' });
    }
    res.json({
      token: signToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  const { id, name, email, role, department, employeeId } = req.user;
  res.json({ id, name, email, role, department, employeeId });
};
