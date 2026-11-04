// ================================================================
// MAK DC — STOCK MOVEMENT SERVICE
// The HEART of the system — every movement goes through here
// ================================================================
const {
  generateMovementNumber,
  isValidMovementType,
  isInflow,
  isOutflow
} = require('./stockHelpers');

// ================================================================
// CREATE MOVEMENT — Core function
// ================================================================
async function createMovement(query, data, user) {
  const {
    stockItemId,
    movementType,
    quantity,
    unitPrice = 0,
    referenceType = 'manual',
    referenceId = null,
    department = null,
    issuedTo = null,
    approvedBy = null,
    approvedById = null,
    reason = null,
    notes = null,
    movementDate = null
  } = data;

  // ============================================================
  // 1. VALIDATION
  // ============================================================
  if (!stockItemId) {
    throw new Error('stockItemId ni lazima.');
  }
  if (!movementType || !isValidMovementType(movementType)) {
    throw new Error(`movementType sio sahihi: ${movementType}`);
  }
  if (quantity === undefined || quantity === null) {
    throw new Error('quantity ni lazima.');
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('quantity lazima iwe namba zaidi ya 0.');
  }

  // ============================================================
  // 2. GET CURRENT STOCK ITEM
  // ============================================================
  const items = await query('SELECT * FROM stock_items WHERE id = $1', [stockItemId]);
  if (items.length === 0) {
    throw new Error(`Stock item (ID: ${stockItemId}) haipo.`);
  }

  const item = items[0];
  const balanceBefore = Number(item.quantity || 0);
  const unit = item.unit || 'pcs';

  // ============================================================
  // 3. CALCULATE BALANCE AFTER
  // ============================================================
  let balanceAfter;
  let actualQty = qty;

  if (isInflow(movementType)) {
    balanceAfter = balanceBefore + qty;
  } else if (isOutflow(movementType)) {
    if (balanceBefore < qty) {
      throw new Error(
        `Stock haitoshi kwa ${item.item_name}. ` +
        `Iliyopo: ${balanceBefore} ${unit}. Unahitaji: ${qty} ${unit}.`
      );
    }
    balanceAfter = balanceBefore - qty;
  } else if (movementType === 'adjustment') {
    // Adjustment inaweza kuwa + au -
    balanceAfter = balanceBefore + qty; 
    if (balanceAfter < 0) {
      throw new Error(`Adjustment itasababisha balance kuwa hasi: ${balanceAfter}`);
    }
  } else if (movementType === 'transfer') {
    balanceAfter = balanceBefore;
  } else {
    throw new Error(`movementType haijulikani: ${movementType}`);
  }

  // ============================================================
  // 4. GENERATE NUMBERS (Movement & Voucher)
  // ============================================================
  const year = new Date().getFullYear();
  
  // A. Movement Number (MV-YYYY-NNNNN)
  const countRes = await query(`SELECT COUNT(*) as c FROM stock_transactions WHERE movement_number LIKE $1`, [`MV-${year}-%`]);
  const nextCount = String(parseInt(countRes[0].c) + 1).padStart(5, '0');
  const movementNumber = `MV-${year}-${nextCount}`;

  // B. Voucher Number (GRN kwa IN, SIV kwa OUT, na REJ kwa Return)
  let voucherNumber = null;
  if (movementType === 'in') {
      voucherNumber = `GRN-${year}-${nextCount}`; // Goods Received Note
  } else if (movementType === 'out') {
      voucherNumber = `SIV-${year}-${nextCount}`; // Store Issue Voucher
  } else if (movementType === 'return') {
      voucherNumber = `SRV-${year}-${nextCount}`; // Store Return Voucher
  } else if (movementType === 'adjustment') {
      voucherNumber = `ADJ-${year}-${nextCount}`; // Adjustment Voucher
  } else {
      voucherNumber = `REF-${year}-${nextCount}`; // Fallback
  }

  // ============================================================
  // 5. INSERT MOVEMENT
  // ============================================================
  const result = await query(`
    INSERT INTO stock_transactions (
      movement_number, reference, stock_item_id, transaction_type, quantity,
      unit_price, total_cost, balance_before, balance_after,
      department, issued_to, performed_by, performed_by_id,
      approved_by, approved_by_id, reason, notes,
      reference_type, reference_id, status, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19, 'completed', $20
    ) RETURNING *
  `, [
    movementNumber, voucherNumber, stockItemId, movementType, actualQty,
    unitPrice, qty * unitPrice, balanceBefore, balanceAfter,
    department, issuedTo, user.fullName, user.userId,
    approvedBy, approvedById, reason, notes,
    referenceType, referenceId, 
    movementDate || new Date()
  ]);
    const newMovement = result[0];
  newMovement.item_name = item.item_name; // 🆕 Ongeza jina la bidhaa hapa
  newMovement.item_unit = item.unit;      // 🆕 Ongeza unit hapa


  // ============================================================
  // 6. UPDATE STOCK ITEM BALANCE
  // ============================================================
  const newQuantity = (movementType === 'transfer') 
    ? balanceBefore 
    : balanceAfter;

  await query(`
    UPDATE stock_items 
    SET quantity = $1, updated_at = NOW()
    WHERE id = $2
  `, [newQuantity, stockItemId]);

  return newMovement;
}

// ================================================================
// CREATE BULK MOVEMENTS (for procurement receive)
// ================================================================
async function createBulkMovements(query, movements, user) {
  const results = [];
  for (const data of movements) {
    const result = await createMovement(query, data, user);
    results.push(result);
  }
  return results;
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
  createMovement,
  createBulkMovements
};