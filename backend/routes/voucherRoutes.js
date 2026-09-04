const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/voucherController');

router.use(protect);

router.post('/', authorize('EMPLOYEE'), upload.single('employeeSignature'), ctrl.createVoucher);
router.put('/:id', authorize('EMPLOYEE'), upload.single('employeeSignature'), ctrl.updateVoucher);
router.delete('/:id', authorize('EMPLOYEE'), ctrl.deleteVoucher);
router.post('/:id/submit', authorize('EMPLOYEE'), ctrl.submitVoucher);
router.get('/mine', authorize('EMPLOYEE'), ctrl.getMyVouchers);

router.get('/pending', authorize('DIRECTOR'), ctrl.getPendingVouchers);
router.post('/:id/approve', authorize('DIRECTOR'), upload.single('directorSignature'), ctrl.approveVoucher);
router.post('/:id/reject', authorize('DIRECTOR'), ctrl.rejectVoucher);

router.get('/', authorize('DIRECTOR', 'ACCOUNTS'), ctrl.getAllVouchers);
router.get('/:id', ctrl.getVoucherById);

module.exports = router;
