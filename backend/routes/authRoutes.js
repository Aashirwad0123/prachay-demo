const router = require('express').Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/authValidators');

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', protect, getMe);

module.exports = router;
