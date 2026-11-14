const express = require('express');
const router = express.Router();
const kpiController = require('../controllers/kpi.controller');
router.get('/metrics/:department', kpiController.getAvailableMetrics);
router.post('/employee', kpiController.createEmployeeKpi);
router.put('/employee/release', kpiController.releaseEmployeeKpis);
router.put('/employee/:id', kpiController.updateEmployeeKpi);
router.get('/employee', kpiController.getEmployeeKpis);

module.exports = router;