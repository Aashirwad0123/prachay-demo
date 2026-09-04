const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/voucherController');
const {
  createVoucherSchema, updateVoucherSchema, rejectSchema, idParamSchema, listQuerySchema,
} = require('../validators/voucherValidators');

router.use(protect);

router.post(
  '/',
  authorize('EMPLOYEE'),
  upload.single('employeeSignature'),
  upload.verifyMagicBytes(),
  validate(createVoucherSchema),
  ctrl.createVoucher
);
router.put(
  '/:id',
  authorize('EMPLOYEE'),
  validate(idParamSchema, 'params'),
  upload.single('employeeSignature'),
  upload.verifyMagicBytes(),
  validate(updateVoucherSchema),
  ctrl.updateVoucher
);
router.delete('/:id', authorize('EMPLOYEE'), validate(idParamSchema, 'params'), ctrl.deleteVoucher);
router.post('/:id/submit', authorize('EMPLOYEE'), validate(idParamSchema, 'params'), ctrl.submitVoucher);
router.get('/mine', authorize('EMPLOYEE'), validate(listQuerySchema, 'query'), ctrl.getMyVouchers);

router.get('/pending', authorize('DIRECTOR'), validate(listQuerySchema, 'query'), ctrl.getPendingVouchers);
router.post(
  '/:id/approve',
  authorize('DIRECTOR'),
  validate(idParamSchema, 'params'),
  upload.single('directorSignature'),
  upload.verifyMagicBytes(),
  ctrl.approveVoucher
);
router.post(
  '/:id/reject',
  authorize('DIRECTOR'),
  validate(idParamSchema, 'params'),
  validate(rejectSchema),
  ctrl.rejectVoucher
);

router.get('/', authorize('DIRECTOR', 'ACCOUNTS'), validate(listQuerySchema, 'query'), ctrl.getAllVouchers);
router.get('/:id/signature', validate(idParamSchema, 'params'), ctrl.getSignature);
router.get('/:id', validate(idParamSchema, 'params'), ctrl.getVoucherById);

module.exports = router;
