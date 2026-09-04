const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(protect);
router.get('/employee', authorize('EMPLOYEE'), ctrl.employeeDashboard);
router.get('/director', authorize('DIRECTOR'), ctrl.directorDashboard);
router.get('/accounts', authorize('ACCOUNTS'), ctrl.accountsDashboard);

module.exports = router;
