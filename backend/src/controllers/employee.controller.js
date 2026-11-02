// ================================================================
// MAK DC INVESTMENT — EMPLOYEE CONTROLLER
// ================================================================
// Handles: List, Get, Create, Update, Delete employees
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// LIST ALL EMPLOYEES
// GET /api/employees
// ================================================================
async function listEmployees(req, res) {
    try {
        const { department, status, search } = req.query;
        
        const where = {};
        if (department) where.department = department;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { employeeId: { contains: search, mode: 'insensitive' } },
                { position: { contains: search, mode: 'insensitive' } }
            ];
        }
        
        const employees = await prisma.employee.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(employees);
        
    } catch (err) {
        console.error('❌ List employees error:', err);
        res.status(500).json({ error: 'Failed to fetch employees.' });
    }
}

// ================================================================
// GET EMPLOYEE BY ID
// GET /api/employees/:id
// ================================================================
async function getEmployee(req, res) {
    try {
        const { id } = req.params;
        
        const employee = await prisma.employee.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found.' });
        }
        
        res.json(employee);
        
    } catch (err) {
        console.error('❌ Get employee error:', err);
        res.status(500).json({ error: 'Failed to fetch employee.' });
    }
}

// ================================================================
// CREATE EMPLOYEE
// POST /api/employees
// ================================================================
async function createEmployee(req, res) {
    try {
        const {
            employeeId,
            fullName,
            position,
            department,
            basicSalary,
            allowances,
            paymentMode,
            bankAccount,
            tin,
            employmentType,
            joinDate,
            status
        } = req.body;
        
        // Check if employeeId exists
        const existing = await prisma.employee.findUnique({
            where: { employeeId }
        });
        
        if (existing) {
            return res.status(400).json({ error: 'Employee ID already exists.' });
        }
        
        const employee = await prisma.employee.create({
            data: {
                employeeId,
                fullName: fullName.trim(),
                position,
                department,
                basicSalary: parseFloat(basicSalary) || 0,
                allowances: parseFloat(allowances) || 0,
                paymentMode: paymentMode || 'Bank Transfer',
                bankAccount: bankAccount || null,
                tin: tin || null,
                employmentType: employmentType || 'Full-time',
                joinDate: joinDate ? new Date(joinDate) : new Date(),
                status: status || 'Active'
            }
        });
        
        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'create_employee',
                entityType: 'employee',
                entityId: String(employee.id),
                details: { employeeId: employee.employeeId, name: employee.fullName },
                ipAddress: req.ip || 'unknown'
            }
        });
        
        res.status(201).json({
            message: 'Employee created successfully!',
            employee
        });
        
    } catch (err) {
        console.error('❌ Create employee error:', err);
        res.status(500).json({ error: 'Failed to create employee.' });
    }
}

// ================================================================
// UPDATE EMPLOYEE
// PUT /api/employees/:id
// ================================================================
async function updateEmployee(req, res) {
    try {
        const { id } = req.params;
        const {
            fullName,
            position,
            department,
            basicSalary,
            allowances,
            paymentMode,
            bankAccount,
            tin,
            employmentType,
            joinDate,
            status
        } = req.body;
        
        const updateData = {};
        if (fullName) updateData.fullName = fullName.trim();
        if (position) updateData.position = position;
        if (department) updateData.department = department;
        if (basicSalary !== undefined) updateData.basicSalary = parseFloat(basicSalary) || 0;
        if (allowances !== undefined) updateData.allowances = parseFloat(allowances) || 0;
        if (paymentMode) updateData.paymentMode = paymentMode;
        if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
        if (tin !== undefined) updateData.tin = tin;
        if (employmentType) updateData.employmentType = employmentType;
        if (joinDate) updateData.joinDate = new Date(joinDate);
        if (status) updateData.status = status;
        
        const employee = await prisma.employee.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        
        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_employee',
                entityType: 'employee',
                entityId: String(employee.id),
                details: { changes: Object.keys(updateData) },
                ipAddress: req.ip || 'unknown'
            }
        });
        
        res.json({
            message: 'Employee updated successfully!',
            employee
        });
        
    } catch (err) {
        console.error('❌ Update employee error:', err);
        res.status(500).json({ error: 'Failed to update employee.' });
    }
}

// ================================================================
// DELETE EMPLOYEE
// DELETE /api/employees/:id
// ================================================================
async function deleteEmployee(req, res) {
    try {
        const { id } = req.params;
        
        const employee = await prisma.employee.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found.' });
        }
        
        await prisma.employee.delete({
            where: { id: parseInt(id) }
        });
        
        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'delete_employee',
                entityType: 'employee',
                entityId: String(id),
                details: { employeeId: employee.employeeId },
                ipAddress: req.ip || 'unknown'
            }
        });
        
        res.json({ message: 'Employee deleted successfully.' });
        
    } catch (err) {
        console.error('❌ Delete employee error:', err);
        res.status(500).json({ error: 'Failed to delete employee.' });
    }
}

module.exports = {
    listEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee
};