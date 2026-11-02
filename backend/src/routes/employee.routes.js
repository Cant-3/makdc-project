// ================================================================
// MAK DC INVESTMENT — EMPLOYEE ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const employeeController = require('../controllers/employee.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// All employee routes require authentication
router.use(authenticate);

// ================================================================
// GET /api/employees — List all employees
// Allowed: SuperAdmin, CEO, Manager, Finance (read)
// ================================================================
router.get('/', 
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance'),
    employeeController.listEmployees
);

// ================================================================
// GET /api/employees/:id — Get single employee
// ================================================================
router.get('/:id',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance'),
    employeeController.getEmployee
);

// ================================================================
// POST /api/employees — Create employee
// Allowed: SuperAdmin, Manager (write)
// ================================================================
router.post('/',
    requireRole('SuperAdmin', 'Manager'),
    employeeController.createEmployee
);

// ================================================================
// PUT /api/employees/:id — Update employee
// ================================================================
router.put('/:id',
    requireRole('SuperAdmin', 'Manager'),
    employeeController.updateEmployee
);

// ================================================================
// DELETE /api/employees/:id — Delete employee
// ================================================================
router.delete('/:id',
    requireRole('SuperAdmin', 'Manager'),
    employeeController.deleteEmployee
);

module.exports = router;