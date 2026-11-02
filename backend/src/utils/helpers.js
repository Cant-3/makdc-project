// ================================================================
// MAK DC INVESTMENT — HELPER FUNCTIONS
// ================================================================

// ================================================================
// GENERATE ORDER ID — Mfano: MAK-2026-0001
// ================================================================
function generateOrderId(sequence) {
    const year = new Date().getFullYear();
    const num = String(sequence).padStart(4, '0');
    return `MAK-${year}-${num}`;
}

// ================================================================
// GENERATE RECEIPT NUMBER
// ================================================================
function generateReceiptNumber() {
    const timestamp = Date.now().toString().slice(-8);
    return `RCP-${timestamp}`;
}

// ================================================================
// GENERATE PAYMENT ID
// ================================================================
function generatePaymentId(prefix = 'PAY') {
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
}

// ================================================================
// GENERATE CONTRACT ID
// ================================================================
function generateContractId() {
    const timestamp = Date.now().toString().slice(-6);
    return `CON-${timestamp}`;
}

// ================================================================
// FORMAT DATE
// ================================================================
function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ================================================================
// SANITIZE EMAIL
// ================================================================
function sanitizeEmail(email) {
    return (email || '').trim().toLowerCase();
}

// ================================================================
// VALIDATE EMAIL
// ================================================================
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ================================================================
// VALIDATE PHONE (Tanzania)
// ================================================================
function isValidPhone(phone) {
    const cleaned = (phone || '').replace(/\s+/g, '');
    return /^(\+?255|0)[0-9]{9}$/.test(cleaned);
}

// ================================================================
// NORMALIZE PHONE
// ================================================================
function normalizePhone(phone) {
    return (phone || '').replace(/\s+/g, '').replace(/^\+?255/, '0');
}

module.exports = {
    generateOrderId,
    generateReceiptNumber,
    generatePaymentId,
    generateContractId,
    formatDate,
    sanitizeEmail,
    isValidEmail,
    isValidPhone,
    normalizePhone
};