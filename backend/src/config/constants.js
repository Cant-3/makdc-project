// ================================================================
// MAK DC INVESTMENT — CONSTANTS
// ================================================================
// Constants zinazotumika kwenye mfumo mzima
// ================================================================

// ================================================================
// ROLES ZA WATUMIAJI
// ================================================================
const ROLES = {
    SUPER_ADMIN: 'SuperAdmin',
    CEO: 'CEO',
    MANAGER: 'Manager',
    FINANCE: 'Finance',
    SALES: 'Sales',
    PROCUREMENT: 'Procurement',
    LAWYER: 'Lawyer',
    ENGINEER: 'Engineer'
};

// ================================================================
// STATUS ZA ORDER
// ================================================================
const ORDER_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    PROCESSING: 'processing',
    AWAITING_PAYMENT: 'awaiting-payment',
    PAID: 'paid',
    IN_TRANSIT: 'in-transit',
    DELIVERED: 'delivered',
    COMPLETED: 'completed',
    REJECTED: 'rejected'
};

// ================================================================
// STATUS ZA PAYMENT
// ================================================================
const PAYMENT_STATUS = {
    PENDING: 'pending',
    AWAITING_PAYMENT: 'awaiting-payment',
    PAID: 'paid',
    REJECTED: 'rejected'
};

// ================================================================
// STATUS ZA CONTRACT
// ================================================================
const CONTRACT_STATUS = {
    PENDING_REVIEW: 'pending-review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SIGNED: 'signed'
};

// ================================================================
// STATUS ZA EMPLOYEE
// ================================================================
const EMPLOYEE_STATUS = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    ON_LEAVE: 'On Leave'
};

// ================================================================
// PAYMENT MODES
// ================================================================
const PAYMENT_MODES = {
    BANK_TRANSFER: 'Bank Transfer',
    MOBILE_MONEY: 'Mobile Money',
    CASH: 'Cash',
    MIXED: 'Mixed'
};

// ================================================================
// CONFIG YA JWT
// ================================================================
const JWT_CONFIG = {
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
    SECRET: process.env.JWT_SECRET ||'default-secret-change-me'
};

module.exports = {
    ROLES,
    ORDER_STATUS,
    PAYMENT_STATUS,
    CONTRACT_STATUS,
    EMPLOYEE_STATUS,
    PAYMENT_MODES,
    JWT_CONFIG
};