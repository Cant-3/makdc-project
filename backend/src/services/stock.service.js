// ================================================================
// MAK DC — STOCK SERVICE
// Business logic for stock items, suppliers, purchase orders
// ================================================================
const {
  generateItemCode,
  generateAdjustmentNumber,
  computeStockStatus
} = require('./stockHelpers');
const { createMovement } = require('./stockMovement.service');

// ================================================================
// 1. LIST STOCK ITEMS (with filters)
// ================================================================
async function listStockItems(query, filters = {}) {
  const { category, status, search, lowStock, warehouse } = filters;
  
  let sql = `SELECT * FROM stock_items WHERE 1=1`;
  const params = [];
  let idx = 1;
  
  if (category) { 
    sql += ` AND category = $${idx++}`; 
    params.push(category); 
  }
  if (status) { 
    sql += ` AND status = $${idx++}`; 
    params.push(status); 
  }
  if (warehouse) { 
    sql += ` AND warehouse = $${idx++}`; 
    params.push(warehouse); 
  }
  if (lowStock === 'true' || lowStock === true) { 
    sql += ` AND quantity <= min_stock_level`; 
  }
  if (search) {
    sql += ` AND (item_name ILIKE $${idx} OR item_code ILIKE $${idx} OR specification ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }
  
  sql += ` ORDER BY item_name ASC`;
  
  const items = await query(sql, params);
  
  // Ongeza computed fields
  return items.map(item => ({
    ...item,
    stockStatus: computeStockStatus(item),
    available: Math.max(0, Number(item.quantity || 0) - Number(item.reserved_qty || 0))
  }));
}

// ================================================================
// 2. GET STOCK ITEM BY ID
// ================================================================
async function getStockItem(query, id) {
  const items = await query('SELECT * FROM stock_items WHERE id = $1', [id]);
  if (items.length === 0) {
    throw new Error(`Stock item (ID: ${id}) haipo.`);
  }
  const item = items[0];
  return {
    ...item,
    stockStatus: computeStockStatus(item),
    available: Math.max(0, Number(item.quantity || 0) - Number(item.reserved_qty || 0))
  };
}

// ================================================================
// 3. CREATE STOCK ITEM
// ================================================================
async function createStockItem(query, data, user) {
  const {
    itemName,
    category = 'General',
    subCategory = null,
    specification = null,
    description = null,
    quantity = 0,
    unit = 'pcs',
    unitPrice = 0,
    minStockLevel = 10,
    maxStockLevel = null,
    location = null,
    warehouse = 'Main Store',
    isSellable = false,
    requiresApproval = true
  } = data;

  if (!itemName || !itemName.trim()) {
    throw new Error('Item name ni lazima.');
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 0) {
    throw new Error('Quantity lazima iwe namba >= 0.');
  }

  const existing = await query(
    `SELECT id FROM stock_items 
     WHERE LOWER(item_name) = LOWER($1) 
     AND COALESCE(specification, '') = COALESCE($2, '')`,
    [itemName.trim(), specification]
  );
  if (existing.length > 0) {
    throw new Error(`Stock item "${itemName}" (spec: ${specification || 'N/A'}) ipo tayari.`);
  }

  const itemCode = await generateItemCode(query, category);

  const result = await query(`
    INSERT INTO stock_items (
      item_code, item_name, category, sub_category, specification, description,
      quantity, unit, unit_price, min_stock_level, max_stock_level,
      location, warehouse, is_sellable, requires_approval, status,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active',
      NOW(), NOW()
    ) RETURNING *
  `, [
    itemCode, itemName.trim(), category, subCategory, specification, description,
    qty, unit, unitPrice, minStockLevel, maxStockLevel,
    location, warehouse, isSellable, requiresApproval
  ]);

  const newItem = result[0];

  if (qty > 0) {
    await createMovement(query, {
      stockItemId: newItem.id,
      movementType: 'in',
      quantity: qty,
      unitPrice,
      referenceType: 'manual',
      reason: 'Initial stock creation',
      notes: `Created by ${user.fullName}`
    }, user);
  }

  return getStockItem(query, newItem.id);
}
// ================================================================
// 4. GET STOCK SUMMARY (for dashboard)
// ================================================================
async function getStockSummary(query) {
  const summaryResult = await query(`
    SELECT 
      COUNT(*)::int AS total_items,
      COALESCE(SUM(quantity), 0)::float AS total_quantity,
      COALESCE(SUM(quantity * unit_price), 0)::float AS total_value,
      COALESCE(SUM(CASE WHEN quantity <= min_stock_level AND quantity > 0 THEN 1 ELSE 0 END), 0)::int AS low_stock_count,
      COALESCE(SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END), 0)::int AS out_of_stock_count,
      COALESCE(SUM(CASE WHEN quantity > min_stock_level THEN 1 ELSE 0 END), 0)::int AS in_stock_count
    FROM stock_items
    WHERE status = 'active'
  `);

  const lowStockItems = await query(`
    SELECT id, item_code, item_name, category, specification, 
           quantity, unit, min_stock_level, location
    FROM stock_items
    WHERE status = 'active' 
      AND quantity <= min_stock_level
    ORDER BY quantity ASC, item_name ASC
    LIMIT 10
  `);

  const categoryBreakdown = await query(`
    SELECT category, COUNT(*)::int as count, 
           COALESCE(SUM(quantity), 0)::float as total_qty,
           COALESCE(SUM(quantity * unit_price), 0)::float as total_value
    FROM stock_items
    WHERE status = 'active'
    GROUP BY category
    ORDER BY count DESC
  `);

  return {
    summary: summaryResult[0] || {
      total_items: 0, total_quantity: 0, total_value: 0,
      low_stock_count: 0, out_of_stock_count: 0, in_stock_count: 0
    },
    lowStockItems,
    categoryBreakdown
  };
}

// ================================================================
// 5. ADJUST STOCK (physical count correction)
// ================================================================
async function adjustStock(query, data, user) {
  const {
    stockItemId,
    newQuantity,
    reason,
    notes = null
  } = data;

  if (!stockItemId) throw new Error('stockItemId ni lazima.');
  if (newQuantity === undefined || newQuantity === null) {
    throw new Error('newQuantity ni lazima.');
  }

  const newQty = Number(newQuantity);
  if (!Number.isFinite(newQty) || newQty < 0) {
    throw new Error('newQuantity lazima iwe namba >= 0.');
  }

  const item = await getStockItem(query, stockItemId);
  const oldQuantity = Number(item.quantity || 0);
  const difference = newQty - oldQuantity;

  if (difference === 0) {
    return { 
      message: 'Hakuna mabadiliko — quantity ni sawa.', 
      oldQuantity, 
      newQuantity: newQty,
      difference: 0
    };
  }

  // Generate adjustment number
  const adjustmentNumber = await generateAdjustmentNumber(query);

  // Insert adjustment record
  await query(`
    INSERT INTO stock_adjustments (
      adjustment_number, stock_item_id, reason,
      system_quantity, physical_quantity, difference,
      approved_by, approved_by_id, performed_by, performed_by_id, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    adjustmentNumber, stockItemId, reason || 'manual-count',
    oldQuantity, newQty, difference,
    user.fullName, user.userId, user.fullName, user.userId, notes
  ]);

  // Create movement (adjustment type, signed qty)
  await createMovement(query, {
    stockItemId,
    movementType: 'adjustment',
    quantity: difference,  // signed
    referenceType: 'adjustment',
    referenceId: adjustmentNumber,
    reference: adjustmentNumber,
    reason: reason || 'Stock count adjustment',
    notes: notes
  }, user);

  return {
    message: 'Stock adjustment imefanyika.',
    adjustmentNumber,
    oldQuantity,
    newQuantity: newQty,
    difference
  };
}

// ================================================================
// 6. LIST MOVEMENTS (with filters)
// ================================================================
async function listMovements(query, filters = {}) {
  const { 
    stockItemId, department, transactionType, 
    startDate, endDate, limit = 100 
  } = filters;

  let sql = `
    SELECT 
      t.*,
      s.item_name,
      s.item_code,
      s.unit as item_unit,
      s.category as item_category
    FROM stock_transactions t
    LEFT JOIN stock_items s ON t.stock_item_id = s.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (stockItemId) { 
    sql += ` AND t.stock_item_id = $${idx++}`; 
    params.push(stockItemId); 
  }
  if (department) { 
    sql += ` AND t.department = $${idx++}`; 
    params.push(department); 
  }
  if (transactionType) { 
    sql += ` AND t.transaction_type = $${idx++}`; 
    params.push(transactionType); 
  }
  if (startDate) { 
    sql += ` AND t.created_at >= $${idx++}`; 
    params.push(startDate); 
  }
  if (endDate) { 
    sql += ` AND t.created_at <= $${idx++}`; 
    params.push(endDate); 
  }

  sql += ` ORDER BY t.created_at DESC LIMIT $${idx++}`;
  params.push(parseInt(limit) || 100);

  return await query(sql, params);
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
  listStockItems,
  getStockItem,
  createStockItem,
  getStockSummary,
  adjustStock,
  listMovements
};