// ================================================================
// MAK DC — STOCK HELPERS
// Number generation, formatting, validation
// ================================================================

// ================================================================
// 1. GENERATE MOVEMENT NUMBER (MV-YYYY-NNNNN)
// ================================================================
async function generateMovementNumber(query) {
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT COUNT(*) as count FROM stock_transactions WHERE movement_number LIKE $1`,
    [`MV-${year}-%`]
  );
  const count = parseInt(result[0].count) + 1;
  return `MV-${year}-${String(count).padStart(5, '0')}`;
}

// ================================================================
// 2. GENERATE ITEM CODE (STK-YYYY-NNNN)
// ================================================================
async function generateItemCode(query, category = 'STK') {
  const year = new Date().getFullYear();
  const prefix = (category || 'STK').substring(0, 3).toUpperCase();
  const result = await query(
    `SELECT COUNT(*) as count FROM stock_items WHERE item_code LIKE $1`,
    [`${prefix}-${year}-%`]
  );
  const count = parseInt(result[0].count) + 1;
  return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
}

// ================================================================
// 3. GENERATE ADJUSTMENT NUMBER (ADJ-YYYY-NNNN)
// ================================================================
async function generateAdjustmentNumber(query) {
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT COUNT(*) as count FROM stock_adjustments WHERE adjustment_number LIKE $1`,
    [`ADJ-${year}-%`]
  );
  const count = parseInt(result[0].count) + 1;
  return `ADJ-${year}-${String(count).padStart(4, '0')}`;
}

// ================================================================
// 4. VALIDATE MOVEMENT TYPE
// ================================================================
const VALID_MOVEMENT_TYPES = [
  'in', 'out', 'transfer', 'adjustment', 'return',
  'damage', 'production-in', 'production-out', 
  'asset-convert', 'sale'
];

const INFLOW_TYPES = ['in', 'return', 'production-in'];
const OUTFLOW_TYPES = ['out', 'damage', 'production-out', 'asset-convert', 'sale'];

function isValidMovementType(type) {
  return VALID_MOVEMENT_TYPES.includes(type);
}

function isInflow(type) {
  return INFLOW_TYPES.includes(type);
}

function isOutflow(type) {
  return OUTFLOW_TYPES.includes(type);
}

// ================================================================
// 5. FORMAT QUANTITY
// ================================================================
function formatQuantity(qty, unit = 'pcs') {
  const n = Number(qty || 0);
  // Kama ni integer, onyesha bila decimal
  if (Number.isInteger(n)) {
    return `${n} ${unit}`;
  }
  return `${n.toFixed(2)} ${unit}`;
}

// ================================================================
// 6. COMPUTE STOCK STATUS
// ================================================================
function computeStockStatus(item) {
  const qty = Number(item.quantity || 0);
  const min = Number(item.min_stock_level || 10);
  
  if (qty === 0) return { status: 'out-of-stock', label: '❌ Out of Stock', color: 'red' };
  if (qty <= min) return { status: 'low-stock', label: '⚠️ Low Stock', color: 'orange' };
  return { status: 'in-stock', label: '✅ In Stock', color: 'green' };
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
  generateMovementNumber,
  generateItemCode,
  generateAdjustmentNumber,
  isValidMovementType,
  isInflow,
  isOutflow,
  formatQuantity,
  computeStockStatus,
  VALID_MOVEMENT_TYPES,
  INFLOW_TYPES,
  OUTFLOW_TYPES
};