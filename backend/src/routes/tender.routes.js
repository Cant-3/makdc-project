const express = require('express');
const router = express.Router();
const c = require('../controllers/tender.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', c.listTenders);
router.post('/', c.createTender);
router.get('/:id', c.getTenderById);
router.put('/:id', c.updateTender);
router.put('/:id/link-procurement', c.linkToProcurement);
router.delete('/:id', c.deleteTender);

module.exports = router;