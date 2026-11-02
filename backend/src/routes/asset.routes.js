// ================================================================
// MAK DC INVESTMENT — ASSET ROUTES
// ================================================================
const express = require('express');
const router = express.Router();
const c = require('../controllers/asset.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// === READ (Wote wanaweza kuona: Procurement, Manager, CEO, Finance) ===
router.get('/', c.listAssets);
router.get('/stats', c.getAssetStats);
router.get('/categories', c.getCategories);
router.get('/maintenance/all', c.listAllMaintenance);
router.get('/:id', c.getAssetById);
router.get('/:id/maintenance', c.listMaintenance);
router.get('/:id/depreciation', c.getDepreciationHistory);

// === WRITE (Procurement & SuperAdmin pekee) ===
router.post('/', c.createAsset);
router.put('/:id', c.updateAsset);
router.put('/:id/retire', c.retireAsset);
router.post('/:id/maintenance', c.createMaintenance);
router.put('/:id/maintenance/:maintId', c.updateMaintenance);
router.post('/:id/depreciation/calculate', c.calculateDepreciation);
router.post('/depreciation/run-annual', c.runAnnualDepreciation);

// === DELETE (SuperAdmin pekee) ===
router.delete('/:id', c.deleteAsset);

module.exports = router;