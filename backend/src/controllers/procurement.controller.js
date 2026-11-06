// ================================================================
// MAK DC INVESTMENT — PROCUREMENT CONTROLLER (PATCHED)
// ================================================================
// Inatumia: pg (raw SQL) — sio Prisma
// JWT payload: { userId, email, role, fullName }
// ================================================================

const { query } = require('../db');
const stockService = require('../services/stock.service');
const stockMovementService = require('../services/stockMovement.service');
const QRCode = require('qrcode');

// ================================================================
// 1. LIST ALL REQUESTS
// ================================================================
async function listAllRequests(req, res) {
    try {
        const requests = await query(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM procurement_items WHERE request_id = r.id) as item_count
            FROM procurement_requests r
            ORDER BY r.created_at DESC
        `);
        res.json(requests);
    } catch (err) {
        console.error('listAllRequests error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 2. LIST INCOMING REQUESTS (Status: pending)
// ================================================================
async function listIncomingRequests(req, res) {
    try {
        const requests = await query(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM procurement_items WHERE request_id = r.id) as item_count
            FROM procurement_requests r
            WHERE r.status = 'pending'
            ORDER BY r.created_at DESC
        `);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 3. LIST REMEDIAL REQUESTS (Returned / Rejected)
// ================================================================
async function listRemedialRequests(req, res) {
    try {
        const requests = await query(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM procurement_items WHERE request_id = r.id) as item_count
            FROM procurement_requests r
            WHERE r.status IN ('returned', 'rejected')
            ORDER BY r.updated_at DESC
        `);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 4. LIST PENDING REQUESTS (Manager, CEO, Finance)
// ================================================================
async function listPendingRequests(req, res) {
    try {
        const { stage } = req.query;
        let statusFilter = '';
        
        if (stage === 'manager') statusFilter = "r.status = 'pending-manager'";
        else if (stage === 'ceo') statusFilter = "r.status = 'pending-ceo'";
        else if (stage === 'finance') statusFilter = "r.status = 'pending-finance'";
        else statusFilter = "r.status IN ('pending-manager', 'pending-ceo', 'pending-finance')";
        
        const requests = await query(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM procurement_items WHERE request_id = r.id) as item_count
            FROM procurement_requests r
            WHERE ${statusFilter}
            ORDER BY r.created_at DESC
        `);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 5. LIST APPROVED REQUESTS
// ================================================================
async function listApprovedRequests(req, res) {
    try {
        const requests = await query(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM procurement_items WHERE request_id = r.id) as item_count
            FROM procurement_requests r
            WHERE r.status IN ('approved', 'purchasing')
            ORDER BY r.ceo_approved_at DESC NULLS LAST
        `);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 6. LIST PAID PROCUREMENTS
// ================================================================
async function listPaidProcurements(req, res) {
    try {
        const requests = await query(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM procurement_items WHERE request_id = r.id) as item_count
            FROM procurement_requests r
            WHERE r.status IN ('paid', 'completed')
            ORDER BY r.paid_at DESC NULLS LAST
        `);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 7. GET SINGLE REQUEST (Pamoja na Items)
// ================================================================
async function getRequestById(req, res) {
    try {
        const { id } = req.params;
        const requests = await query(`SELECT * FROM procurement_requests WHERE id = $1`, [id]);
        
        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        const items = await query(`SELECT * FROM procurement_items WHERE request_id = $1`, [id]);
        
        // 🆕 Rejesha kila kitu pamoja na imprest_number na purchaser_details
        res.json({ 
            ...requests[0], 
            items,
            // Hizi zinahakikisha Finance anaona details za Purchaser
            supplier_name: requests[0].supplier_name || null,
            invoice_number: requests[0].invoice_number || null,
            purchaser_details: requests[0].purchaser_details || null, 
            imprest_number: requests[0].imprest_number || null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// 8. CREATE REQUEST
// ================================================================
async function createRequest(req, res) {
    try {
        const { department, items, notes, title, urgency, requiredBy, attachments } = req.body;
        const user = req.user;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }
        if (!user || !user.userId) {
          return res.status(401).json({ error: 'User not authenticated properly' });
        }
        const requestNumber = 'PR-' + Date.now();
        const isProcurement = user.role === 'Procurement';
        const initialStatus = isProcurement ? 'pending-procurement' : 'pending';
        const totalAmount = items.reduce((sum, item) => 
            sum + (parseFloat(item.estimatedPrice) || 0) * (parseInt(item.quantity) || 0), 0);

        // 🆕 Fix: Tumia user.userId (sio user.id)
        const requestResult = await query(`
            INSERT INTO procurement_requests 
            (request_number, department, requested_by, requested_by_id, status, total_amount, notes, title, urgency, required_by, attachments, item_count, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
            RETURNING *
        `, [
            requestNumber, department, user.fullName, user.userId, initialStatus, 
            totalAmount, notes || null, title || null, urgency || 'normal', 
            requiredBy || null, JSON.stringify(attachments || []), items.length
        ]);

        const request = requestResult[0];

        // Insert items
        for (const item of items) {
            await query(`
                INSERT INTO procurement_items 
                (request_id, item_name, specification, quantity, unit, estimated_price, notes, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            `, [
                request.id, 
                item.itemName, 
                item.specification || null,
                item.quantity, 
                item.unit || 'pcs', 
                item.estimatedPrice || 0,
                item.notes || null
            ]);
        }

        res.json({ ...request, items });

    } catch (err) {
        console.error('Create request error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 9. UPDATE STATUS
// ================================================================
async function updateStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, notes, supplierName, invoiceNumber } = req.body;

        const allowedStatuses = ['returned', 'rejected', 'pending-manager', 'pending-ceo', 'approved', 'purchasing', 'pending-finance', 'paid', 'completed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        let updateQuery = 'UPDATE procurement_requests SET status = $1, updated_at = NOW()';
        let params = [status];
        let idx = 2;

        if (status === 'pending-ceo') {
            updateQuery += `, manager_approved_at = NOW()`;
            if (notes) { updateQuery += `, manager_notes = $${idx}`; params.push(notes); idx++; }
        }
        else if (status === 'approved') {
            updateQuery += `, ceo_approved_at = NOW()`;
            if (notes) { updateQuery += `, ceo_notes = $${idx}`; params.push(notes); idx++; }
        }
        else if (status === 'pending-finance') {
            if (supplierName) { updateQuery += `, supplier_name = $${idx}`; params.push(supplierName); idx++; }
            if (invoiceNumber) { updateQuery += `, invoice_number = $${idx}`; params.push(invoiceNumber); idx++; }
            if (notes) { updateQuery += `, procurement_notes = $${idx}`; params.push(notes); idx++; }
        }
        else if (status === 'paid') {
            updateQuery += `, paid_at = NOW()`;
            if (notes) { updateQuery += `, finance_notes = $${idx}`; params.push(notes); idx++; }
        }
        else if (status === 'rejected' || status === 'returned') {
            if (notes) { updateQuery += `, rejection_reason = $${idx}`; params.push(notes); idx++; }
        }

        updateQuery += ` WHERE id = $${idx} RETURNING *`;
        params.push(id);

        const result = await query(updateQuery, params);
        
        if (result.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(result[0]);
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// 1. LIST STOCK ITEMS (Inatumia Stock Service)
// ================================================================
async function listStockItems(req, res) {
  try {
    const filters = {
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
      lowStock: req.query.lowStock,
      warehouse: req.query.warehouse
    };
    const items = await stockService.listStockItems(query, filters);
    res.json(items);
  } catch (err) {
    console.error('listStockItems error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 2. GET STOCK SUMMARY (Inatumia Stock Service)
// ================================================================
async function getStockSummary(req, res) {
  try {
    const data = await stockService.getStockSummary(query);
    res.json(data);
  } catch (err) {
    console.error('getStockSummary error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 3. GET LOW STOCK ITEMS (Inatumia Stock Service)
// ================================================================
async function getLowStockItems(req, res) {
  try {
    const items = await stockService.listStockItems(query, { lowStock: true });
    res.json(items);
  } catch (err) {
    console.error('getLowStockItems error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 4. GET SINGLE STOCK ITEM (Mpya)
// ================================================================
async function getStockItemById(req, res) {
  try {
    const item = await stockService.getStockItem(query, req.params.id);
    res.json(item);
  } catch (err) {
    console.error('getStockItemById error:', err);
    res.status(err.message.includes('haipo') ? 404 : 500).json({ error: err.message });
  }
}
// ================================================================
// GET FUEL LOGS (Kutoka Database)
// ================================================================
async function getFuelLogs(req, res) {
    try {
        const logs = await query(`
            SELECT 
                f.*, 
                a.name AS asset_name, 
                a.serial_number AS asset_plate
            FROM fuel_logs f
            LEFT JOIN assets a ON f.asset_id = a.id
            ORDER BY f.created_at DESC
        `);
        res.json(logs);
    } catch (err) {
        console.error('getFuelLogs error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// ISSUE FUEL (Inaingiza kwenye Database na Kupunguza Stock)
// ================================================================
async function issueFuel(req, res) {
    try {
        const { 
            fuelType, 
            assetId, 
            liters, 
            driverName, 
            purpose, 
            stockItemId 
        } = req.body;
        const user = req.user;

        // 1. Validation
        if (!fuelType || !assetId || !liters || !driverName) {
            return res.status(400).json({ error: 'Tafadhali jaza taarifa zote muhimu.' });
        }

        // 2. Punguza Stock (Tumia service ya stock)
        if (stockItemId) {
            // Pata stock item ya sasa
            const stockItems = await query('SELECT * FROM stock_items WHERE id = $1', [stockItemId]);
            if (stockItems.length === 0) throw new Error('Stock item haipo.');
            
            const currentStock = Number(stockItems[0].quantity);
            const newQuantity = currentStock - Number(liters);
            
            if (newQuantity < 0) throw new Error('Mafuta yaliyopo store hayatoshi.');

            // Sasisha stock
            await query(
                'UPDATE stock_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
                [newQuantity, stockItemId]
            );

            // Rekodi movement
            await query(`
                INSERT INTO stock_movements 
                (stock_item_id, movement_type, quantity, balance_before, balance_after, reason, notes, performed_by, created_at)
                VALUES ($1, 'out', $2, $3, $4, 'Fuel Issued', $5, $6, NOW())
            `, [
                stockItemId, liters, currentStock, newQuantity,
                `Fuel issued to ${driverName} for vehicle ${assetId}`,
                user.fullName
            ]);
        }

        // 3. Tengeneza Permit Number
        const permitNumber = `FP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

        // 4. Ingiza kwenye fuel_logs table
        const result = await query(`
            INSERT INTO fuel_logs 
            (permit_number, fuel_type, asset_id, liters, driver_name, purpose, issued_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *
        `, [
            permitNumber, fuelType, assetId, liters, driverName, purpose, user.fullName
        ]);

        const newLog = result[0];

        // 5. Pata taarifa za gari kwa ajili ya PDF
        const assets = await query('SELECT * FROM assets WHERE id = $1', [assetId]);
        const asset = assets.length > 0 ? assets[0] : { name: 'Unknown', serial_number: 'N/A' };

        res.json({
            success: true,
            message: 'Mafuta yametolewa na stock imepunguzwa.',
            log: {
                ...newLog,
                asset_name: asset.name,
                asset_plate: asset.serial_number
            }
        });

    } catch (err) {
        console.error('issueFuel error:', err);
        res.status(400).json({ error: err.message });
    }
}
// ================================================================
// 5. CREATE STOCK ITEM (Inatumia Stock Service)
// ================================================================
async function addStockItem(req, res) {
  try {
    const item = await stockService.createStockItem(query, req.body, req.user);
    res.status(201).json(item);
  } catch (err) {
    console.error('addStockItem error:', err);
    res.status(400).json({ error: err.message });
  }
}
async function adjustStockItem(req, res) {
  try {
    // 1. Chukua data zote kutoka kwa Frontend
    const { stockItemId, newQuantity, reason, notes } = req.body;
    
    // 2. Validation ya Msingi
    if (!stockItemId) throw new Error("stockItemId ni lazima.");
    if (newQuantity === undefined || newQuantity < 0) throw new Error("newQuantity ni lazima na isiwe chini ya 0.");
    if (!reason) throw new Error("Sababu (reason) ni lazima.");

    // 3. Tuma kwa stockService (Hii inashughulikia database)
    const result = await stockService.adjustStock(query, {
      stockItemId: parseInt(stockItemId),
      newQuantity: parseFloat(newQuantity),
      reason: reason,
      notes: notes || ''
    }, req.user);

    // 4. Rudisha majibu kwa Frontend
    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result
    });

  } catch (err) {
    console.error('adjustStockItem error:', err);
    res.status(400).json({ error: err.message });
  }
}

// ================================================================
// 7. STOCK OUT / ISSUE TO DEPARTMENT (Inatumia Movement Service)
// ================================================================
async function stockOut(req, res) {
  try {
    const { stockItemId, quantity, department, notes, issuedTo } = req.body;

    if (!stockItemId) throw new Error('stockItemId ni lazima.');
    if (!quantity || quantity <= 0) throw new Error('quantity ni lazima na > 0.');
    if (!department || !department.trim()) {
      throw new Error('department ni lazima (mfano: Production, IT, Admin).');
    }

    const movement = await stockMovementService.createMovement(query, {
      stockItemId,
      movementType: 'out',
      quantity,
      department: department.trim(),
      issuedTo: issuedTo || null,
      referenceType: 'manual',
      reason: notes || 'Stock issue to department'
    }, req.user);

    res.json({ 
      message: 'Stock imetolewa kikamilifu.',
      movement 
    });
  } catch (err) {
    console.error('stockOut error:', err);
    res.status(400).json({ error: err.message });
  }
}

// ================================================================
// 8. LIST MOVEMENTS (Inatumia Stock Service)
// ================================================================
async function listStockMovements(req, res) {
  try {
    const movements = await stockService.listMovements(query, {
      stockItemId: req.query.stockItemId,
      department: req.query.department,
      transactionType: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit || 100
    });
    res.json(movements);
  } catch (err) {
    console.error('listStockMovements error:', err);
    res.status(500).json({ error: err.message });
  }
}
async function receiveStockFromProcurement(req, res) {
  try {
    const { requestId } = req.params;
    const user = req.user;

    const requests = await query('SELECT * FROM procurement_requests WHERE id = $1', [requestId]);
    if (requests.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = requests[0];
    if (request.status !== 'paid') {
      return res.status(400).json({ error: 'Request lazima iwe imelipwa (paid) kabla ya kupokea.' });
    }
    if (request.received_as_stock || request.received_as_asset) {
      return res.status(400).json({ error: 'Request hii tayari imepokelewa.' });
    }

    const items = await query('SELECT * FROM procurement_items WHERE request_id = $1', [requestId]);

    for (const item of items) {
      // 🆕 1. TAMBUA KAMA NI MAFUTA NA UPE JINA SAHIHI
      let itemName = item.item_name;
      let category = 'Procurement';
      
      // Kama jina lina "petrol" au "diesel", weka category kuwa "Fuel"
      if (itemName.toLowerCase().includes('petrol') || itemName.toLowerCase().includes('diesel')) {
          category = 'Fuel';
          // Hakikisha jina ni "Petrol" au "Diesel" safi
          if (itemName.toLowerCase().includes('petrol')) itemName = 'Petrol';
          if (itemName.toLowerCase().includes('diesel')) itemName = 'Diesel';
      }

      // 2. Angalia kama Item ipo kwenye Stock (Tumia jina lililosafishwa)
      const existing = await query(
        `SELECT id FROM stock_items 
         WHERE LOWER(item_name) = LOWER($1) 
         AND COALESCE(specification, '') = COALESCE($2, '')`,
        [itemName, item.specification]
      );

      let stockItemId;
      if (existing.length > 0) {
        stockItemId = existing[0].id;
      } else {
        // 3. Unda mpya kwenye Stock
        const newItem = await stockService.createStockItem(query, {
          itemName: itemName,      // 🆕 Tumia jina lililosafishwa
          category: category,      // 🆕 Weka category kuwa 'Fuel' kama ni mafuta
          specification: item.specification,
          quantity: 0, 
          unit: item.unit,
          unitPrice: item.estimated_price,
          location: 'Main Store'
        }, user);
        stockItemId = newItem.id;
      }

      // 4. Rekodi Movement ya 'IN'
      await stockMovementService.createMovement(query, {
        stockItemId: stockItemId,
        movementType: 'in',
        quantity: item.quantity,
        unitPrice: item.estimated_price,
        referenceType: 'procurement',
        referenceId: String(requestId),
        reference: request.request_number,
        department: request.department,
        reason: `Received from ${request.request_number}`
      }, user);
    }

    // 5. Update Request kuwa 'completed'
    await query(`
      UPDATE procurement_requests 
      SET status = 'completed', 
          received_as_stock = TRUE,
          received_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [requestId]);

    res.json({ message: 'Stock imepokelewa kikamilifu.', requestId });
  } catch (err) {
    console.error('receiveStockFromProcurement error:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 🆕 MESSAGES
// ================================================================
async function getRequestMessages(req, res) {
    try {
        const { id } = req.params;
        // 🆕 Hakikisha tunarudisha sender_id na is_read
        const messages = await query(`
            SELECT 
                id, 
                request_id, 
                sender_id, 
                sender_name, 
                sender_role, 
                subject, 
                body, 
                is_read, 
                created_at
            FROM procurement_request_messages 
            WHERE request_id = $1 
            ORDER BY created_at ASC
        `, [id]);
        
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function sendRequestMessage(req, res) {
    try {
        const { id } = req.params;
        const { subject, body } = req.body;
        const user = req.user;

        if (!body || !body.trim()) {
            return res.status(400).json({ error: 'Message body is required' });
        }

        const result = await query(`
            INSERT INTO procurement_request_messages 
            (request_id, sender_id, sender_name, sender_role, subject, body)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [id, user.userId, user.fullName, user.role, subject || null, body.trim()]);

        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 🆕 FOLLOW-UP
// ================================================================
async function saveRequestFollowUp(req, res) {
    try {
        const { id } = req.params;
        const { note } = req.body;
        const user = req.user;

        if (!note || !note.trim()) {
            return res.status(400).json({ error: 'Follow-up note is required' });
        }

        // Pata status ya sasa
        const reqRow = await query('SELECT status FROM procurement_requests WHERE id = $1', [id]);
        const statusAtTime = reqRow.length > 0 ? reqRow[0].status : null;

        const result = await query(`
            INSERT INTO procurement_request_followups 
            (request_id, note, status_at_time, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [id, note.trim(), statusAtTime, user.userId]);

        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// 🆕 MARK MESSAGES AS READ
// ================================================================
async function markMessagesAsRead(req, res) {
    try {
        const { id } = req.params;
        const user = req.user;
        
        // Update messages ambazo si zake kuwa "read"
        await query(`
            UPDATE procurement_request_messages 
            SET is_read = TRUE 
            WHERE request_id = $1 
              AND sender_id != $2 
              AND is_read = FALSE
        `, [id, user.userId]);
        
        res.json({ message: 'Messages marked as read', requestId: id });
    } catch (err) {
        console.error('markMessagesAsRead error:', err);
        res.status(500).json({ error: err.message });
    }
}

// 🆕 TYPING STATUS
async function setTypingStatus(req, res) {
    try {
        const { id } = req.params;
        const { isTyping } = req.body;
        const user = req.user;
        
        // Hifadhi kwenye memory (kwa production tumia Redis)
        if (!global.typingStatus) global.typingStatus = {};
        if (!global.typingStatus[id]) global.typingStatus[id] = {};
        
        global.typingStatus[id][user.userId] = {
            isTyping: !!isTyping,
            name: user.fullName,
            timestamp: Date.now()
        };
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// 🆕 CHECK IF ANYONE IS TYPING
async function getTypingStatus(req, res) {
    try {
        const { id } = req.params;
        const user = req.user;
        
        if (!global.typingStatus || !global.typingStatus[id]) {
            return res.json({ typing: [] });
        }
        
        const now = Date.now();
        const typingUsers = [];
        
        Object.entries(global.typingStatus[id]).forEach(([userId, data]) => {
            // Ignore kama ni mimi au imepita sekunde 5
            if (Number(userId) === user.userId) return;
            if (now - data.timestamp > 5000) return;
            if (data.isTyping) {
                typingUsers.push({ id: userId, name: data.name });
            }
        });
        
        res.json({ typing: typingUsers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// ONGEZA HIZI KWENYE procurement.controller.js ILIYOPO
// ================================================================

const imprestService = require('../services/imprest.service');
const path = require('path');
const fs = require('fs');

// ================================================================
// HELPER: Log status change
// ================================================================
async function logStatusChange(query, requestId, fromStatus, toStatus, user, notes = null) {
  try {
    await query(
      `INSERT INTO procurement_status_history 
       (request_id, from_status, to_status, changed_by, changed_by_id, changed_by_role, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [requestId, fromStatus, toStatus, user.fullName, user.userId, user.role, notes]
    );
  } catch (e) { console.error('History log error:', e); }
}

// ================================================================
// HELPER: Send notification
// ================================================================
async function notify(query, userId, type, title, message, link = null) {
  try {
    if (!userId) return;
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, link]
    );
  } catch (e) { console.error('Notification error:', e); }
}

// ================================================================
// 1. PROCUREMENT FORWARD TO MANAGER
// ================================================================
async function procurementForwardToManager(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'Procurement' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Procurement pekee anaweza kupitisha.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'pending-procurement') {
      return res.status(400).json({ error: `Request iko kwenye status "${request.status}", haiwezi kupitishwa.` });
    }

    await query(
      `UPDATE procurement_requests SET status = 'pending-manager', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await logStatusChange(query, id, 'pending-procurement', 'pending-manager', user, 'Procurement amepitisha kwa Manager');

    // Notify managers
    const managers = await query(`SELECT id FROM users WHERE role = 'Manager' AND status = 'Active'`);
    for (const m of managers) {
      await notify(query, m.id, 'procurement', '📋 Request Mpya',
        `Request ${request.request_number} inahitaji idhini yako.`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Request imepitishwa kwa Manager.' });
  } catch (err) {
    console.error('procurementForwardToManager:', err);
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 2. MANAGER APPROVE / REJECT
// ================================================================
async function managerApproveRequest(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    if (user.role !== 'Manager' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Manager pekee anaweza kuidhinisha.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'pending-manager') {
      return res.status(400).json({ error: `Request iko kwenye status "${request.status}".` });
    }

    await query(
      `UPDATE procurement_requests 
       SET status = 'pending-ceo', manager_approved_at = NOW(), manager_notes = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, notes || null]
    );

    await logStatusChange(query, id, 'pending-manager', 'pending-ceo', user, notes);

    // Notify CEO
    const ceos = await query(`SELECT id FROM users WHERE role = 'CEO' AND status = 'Active'`);
    for (const c of ceos) {
      await notify(query, c.id, 'procurement', '🏢 Request Inahitaji Idhini',
        `Request ${request.request_number} imepitishwa na Manager.`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Request imepitishwa kwa CEO.' });
  } catch (err) {
    console.error('managerApproveRequest:', err);
    res.status(500).json({ error: err.message });
  }
}

async function managerRejectRequest(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (!reason) return res.status(400).json({ error: 'Sababu ya kukataa inahitajika.' });

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    await query(
      `UPDATE procurement_requests 
       SET status = 'returned', rejection_stage = 'manager', rejection_reason = $2,
           returned_at = NOW(), returned_by = $3, updated_at = NOW()
       WHERE id = $1`,
      [id, reason, user.fullName]
    );

    await logStatusChange(query, id, 'pending-manager', 'returned', user, reason);

    // Notify procurement
    const procs = await query(`SELECT id FROM users WHERE role = 'Procurement' AND status = 'Active'`);
    for (const p of procs) {
      await notify(query, p.id, 'procurement', '❌ Request Imekataliwa',
        `Request ${rows[0].request_number} imekataliwa na Manager: ${reason}`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Request imerudishwa kwa Procurement.' });
  } catch (err) {
    console.error('managerRejectRequest:', err);
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 3. CEO APPROVE → GENERATE IMPREST PDF
// ================================================================
async function ceoApproveRequest(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    if (user.role !== 'CEO' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'CEO pekee anaweza kuidhinisha mwisho.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'pending-ceo') {
      return res.status(400).json({ error: `Request iko kwenye status "${request.status}".` });
    }

    // Pata items
    const items = await query('SELECT * FROM procurement_items WHERE request_id = $1', [id]);

    // Tengeneza imprest number
    const imprestNumber = await imprestService.generateImprestNumber(query);

    // QR code data (verification URL)
    const qrText = `MAKDC-IMP-${imprestNumber}-${request.request_number}-${Date.now()}`;
    const qrCodeData = await imprestService.generateQRCode(qrText);

    // Tengeneza PDF
    const itemsForPDF = items.map(it => ({
      itemName: it.item_name,
      specification: it.specification,
      quantity: it.quantity,
      unit: it.unit,
      estimatedPrice: it.estimated_price,
    }));

    const pdfResult = await imprestService.generateImprestPDF({
      imprestNumber,
      requestNumber: request.request_number,
      department: request.department,
      requestedBy: request.requested_by,
      title: request.title,
      items: itemsForPDF,
      totalAmount: request.total_amount,
      approvedByCeo: user.fullName,
      approvedAt: new Date(),
      qrCodeData,
    });

    // Hifadhi imprest kwenye DB
    const imprestResult = await query(
      `INSERT INTO procurement_imprests 
       (imprest_number, request_id, request_number, department, requested_by, title,
        items, total_amount, approved_by_ceo, approved_by_ceo_id, qr_code_data, pdf_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        imprestNumber, id, request.request_number, request.department,
        request.requested_by, request.title, JSON.stringify(itemsForPDF),
        request.total_amount, user.fullName, user.userId, qrCodeData, pdfResult.filename,
      ]
    );

    const imprest = imprestResult[0];

    // Update request
    await query(
      `UPDATE procurement_requests 
       SET status = 'pending-purchaser-details', ceo_approved_at = NOW(),
           ceo_notes = $2, imprest_id = $3, imprest_number = $4,
           imprest_generated_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id, notes || null, imprest.id, imprestNumber]
    );

    await logStatusChange(query, id, 'pending-ceo', 'pending-purchaser-details', user, `Imprest ${imprestNumber} imetengenezwa`);

    // Notify procurement
    const procs = await query(`SELECT id FROM users WHERE role = 'Procurement' AND status = 'Active'`);
    for (const p of procs) {
      await notify(query, p.id, 'procurement', '✅ Imprest Imetengenezwa',
        `Request ${request.request_number} imeidhinishwa. Imprest: ${imprestNumber}. Jaza details za manunuzi.`,
        `/procurement/${id}`);
    }

    res.json({
      success: true,
      message: 'Request imeidhinishwa. Imprest imetengenezwa.',
      imprest: { id: imprest.id, number: imprestNumber, pdf: pdfResult.filename },
    });
  } catch (err) {
    console.error('ceoApproveRequest:', err);
    res.status(500).json({ error: err.message });
  }
}

async function ceoRejectRequest(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (!reason) return res.status(400).json({ error: 'Sababu inahitajika.' });

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    await query(
      `UPDATE procurement_requests 
       SET status = 'returned', rejection_stage = 'ceo', rejection_reason = $2,
           returned_at = NOW(), returned_by = $3, updated_at = NOW()
       WHERE id = $1`,
      [id, reason, user.fullName]
    );

    await logStatusChange(query, id, 'pending-ceo', 'returned', user, reason);

    const procs = await query(`SELECT id FROM users WHERE role = 'Procurement' AND status = 'Active'`);
    for (const p of procs) {
      await notify(query, p.id, 'procurement', '❌ Request Imekataliwa na CEO',
        `Request ${rows[0].request_number}: ${reason}`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Request imerudishwa kwa Procurement.' });
  } catch (err) {
    console.error('ceoRejectRequest:', err);
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 4. SUBMIT PURCHASER DETAILS + IMPREST ATTACHMENT
// ================================================================
async function submitPurchaserDetails(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const {
      supplierName, supplierContact, supplierTin,
      invoiceNumber, invoiceDate, actualTotal,
      paymentTerms, expectedDeliveryDate, procurementNotes,
      imprestAttachment, // base64 au filename
    } = req.body;

    if (user.role !== 'Procurement' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Procurement pekee.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'pending-purchaser-details') {
      return res.status(400).json({ error: `Request iko kwenye status "${request.status}".` });
    }

    if (!supplierName || !invoiceNumber) {
      return res.status(400).json({ error: 'Supplier name na invoice number vinahitajika.' });
    }

    if (!imprestAttachment) {
      return res.status(400).json({ error: '⚠ LAZIMA u-attach imprest PDF (kibali cha CEO).' });
    }

    const purchaserDetails = {
      supplierName, supplierContact, supplierTin,
      invoiceNumber, invoiceDate, actualTotal,
      paymentTerms, expectedDeliveryDate, procurementNotes,
      imprestAttachment,
      submittedAt: new Date().toISOString(),
      submittedBy: user.fullName,
    };

    await query(
      `UPDATE procurement_requests 
       SET status = 'pending-finance', purchaser_details = $2,
           purchaser_details_at = NOW(), purchaser_details_by = $3,
           supplier_name = $4, invoice_number = $5,
           updated_at = NOW()
       WHERE id = $1`,
      [id, JSON.stringify(purchaserDetails), user.fullName, supplierName, invoiceNumber]
    );

    await logStatusChange(query, id, 'pending-purchaser-details', 'pending-finance', user, `Supplier: ${supplierName}, Invoice: ${invoiceNumber}`);

    // Notify finance
    const fins = await query(`SELECT id FROM users WHERE role = 'Finance' AND status = 'Active'`);
    for (const f of fins) {
      await notify(query, f.id, 'procurement', '💰 Request Inahitaji Malipo',
        `Request ${request.request_number} imefikishwa na Procurement. Supplier: ${supplierName}.`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Details zimehifadhiwa. Request imepelekwa kwa Finance.' });
  } catch (err) {
    console.error('submitPurchaserDetails:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 5. FINANCE VERIFY → SEND PAYMENT TO MANAGER (Through Company Payments)
// ================================================================
async function financeVerifyAndSendToManager(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'Finance' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Finance pekee.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'pending-finance') {
      return res.status(400).json({ error: `Request iko kwenye status "${request.status}".` });
    }
    // Kabla ya INSERT
    if (request.payment_reference) {
      const existing = await query(
        'SELECT id FROM company_payments WHERE reference = $1',
        [request.payment_reference]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Malipo tayari yameundwa.' });
      }
    }

    const details = request.purchaser_details || {};
    const year = new Date().getFullYear();
    
    // Tengeneza reference ya Company Payment
    const payCount = await query(
      `SELECT COUNT(*) as c FROM company_payments WHERE reference LIKE $1`,
      [`PAY-${year}-%`]
    );
    const payRef = `PAY-${year}-${String(parseInt(payCount[0].c) + 1).padStart(3, '0')}`;

    // Unda Company Payment record
    const payResult = await query(
      `INSERT INTO company_payments 
       (type, reference, vendor, amount, description, status, created_by, 
        sent_to_manager_at, sent_to_manager_by)
       VALUES ('procurement', $1, $2, $3, $4, 'pending-manager', $5, NOW(), $5)
       RETURNING *`,
      [
        payRef, 
        details.supplierName || request.supplier_name,
        details.actualTotal || request.total_amount,
        `Malipo ya Manunuzi: ${request.request_number} - ${request.title}`,
        user.fullName
      ]
    );

    const payment = payResult[0];

    // Update request kuwa inasubiri malipo
    await query(
      `UPDATE procurement_requests 
       SET status = 'pending-payment-approval', 
           payment_reference = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [id, payRef]
    );

    await logStatusChange(query, id, 'pending-finance', 'pending-payment-approval', user, `Payment ${payRef} created`);

    // Notify managers
    const managers = await query(`SELECT id FROM users WHERE role = 'Manager' AND status = 'Active'`);
    for (const m of managers) {
      await notify(query, m.id, 'payment', '💸 Malipo ya Manunuzi',
        `Malipo ${payRef} (TSh ${Number(payment.amount).toLocaleString()}) yanahitaji idhini yako.`,
        `/finance#tab-company-payments`);
    }

    res.json({
      success: true,
      message: 'Malipo yamepelekwa kwa Manager (Company Payments).',
      payment: { reference: payRef, amount: payment.amount },
    });
  } catch (err) {
    console.error('financeVerifyAndSendToManager:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 6a. MANAGER APPROVE PAYMENT (Through Company Payments)
// ================================================================
async function managerApprovePayment(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    if (user.role !== 'Manager' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Manager pekee anaweza kuidhinisha malipo.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'pending-payment-approval') {
      return res.status(400).json({
        error: `Request iko kwenye status "${request.status}". Inatakiwa "pending-payment-approval".`
      });
    }

    if (!request.payment_reference) {
      return res.status(400).json({ error: 'Request haina payment reference. Finance hajaunda malipo.' });
    }

    // ✅ Update company_payments (sio procurement_payments)
    const updateResult = await query(`
      UPDATE company_payments 
      SET status = 'pending-ceo',
          manager_verified_at = NOW(),
          manager_verified_by = $1,
          updated_at = NOW()
      WHERE reference = $2 AND status = 'pending-manager'
      RETURNING *
    `, [user.fullName, request.payment_reference]);

    if (updateResult.length === 0) {
      return res.status(400).json({
        error: `Malipo ${request.payment_reference} hayapo kwenye status "pending-manager". Labda yameidhinishwa tayari.`
      });
    }

    // Update procurement request status — inasubiri CEO
    await query(`
      UPDATE procurement_requests 
      SET status = 'payment-pending-ceo', updated_at = NOW()
      WHERE id = $1
    `, [id]);

    await logStatusChange(
      query, id, 'pending-payment-approval', 'payment-pending-ceo',
      user, notes || 'Manager ameidhinisha malipo'
    );

    // Notify CEO
    const ceos = await query(`SELECT id FROM users WHERE role = 'CEO' AND status = 'Active'`);
    for (const c of ceos) {
      await notify(
        query, c.id, 'payment', '💸 Malipo Yanahitaji Idhini',
        `Request ${request.request_number}: Malipo ${request.payment_reference} yamepitishwa na Manager.`,
        `/finance#tab-company-payments`
      );
    }

    res.json({
      success: true,
      message: 'Malipo yamepitishwa kwa CEO.',
      payment_reference: request.payment_reference
    });

  } catch (err) {
    console.error('managerApprovePayment error:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 6b. MANAGER REJECT PAYMENT
// ================================================================
async function managerRejectPayment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (user.role !== 'Manager' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Manager pekee anaweza kukataa malipo.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Sababu ya kukataa inahitajika.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'pending-payment-approval') {
      return res.status(400).json({
        error: `Request iko kwenye status "${request.status}".`
      });
    }

    if (!request.payment_reference) {
      return res.status(400).json({ error: 'Request haina payment reference.' });
    }

    // ✅ Update company_payments
    const updateResult = await query(`
      UPDATE company_payments 
      SET status = 'rejected',
          rejected_by = $1,
          rejected_at = NOW(),
          rejection_reason = $2,
          updated_at = NOW()
      WHERE reference = $3 AND status = 'pending-manager'
      RETURNING *
    `, [user.fullName, reason.trim(), request.payment_reference]);

    if (updateResult.length === 0) {
      return res.status(400).json({
        error: `Malipo ${request.payment_reference} hayapo kwenye status "pending-manager".`
      });
    }

    // Update request — rudi kwa Finance
    await query(`
      UPDATE procurement_requests 
      SET status = 'payment-returned',
          rejection_stage = 'payment-manager',
          rejection_reason = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [reason.trim(), id]);

    await logStatusChange(
      query, id, 'pending-payment-approval', 'payment-returned',
      user, reason.trim()
    );

    // Notify Finance
    const fins = await query(`SELECT id FROM users WHERE role = 'Finance' AND status = 'Active'`);
    for (const f of fins) {
      await notify(
        query, f.id, 'payment', '❌ Malipo Yamekataliwa',
        `Request ${request.request_number}: ${reason.trim()}`,
        `/procurement/${id}`
      );
    }

    res.json({
      success: true,
      message: 'Malipo yamerudishwa kwa Finance.',
      reason: reason.trim()
    });

  } catch (err) {
    console.error('managerRejectPayment error:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 7a. CEO APPROVE PAYMENT
// ================================================================
async function ceoApprovePayment(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    if (user.role !== 'CEO' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'CEO pekee anaweza kuidhinisha malipo.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'payment-pending-ceo') {
      return res.status(400).json({
        error: `Request iko kwenye status "${request.status}". Inatakiwa "payment-pending-ceo".`
      });
    }

    if (!request.payment_reference) {
      return res.status(400).json({ error: 'Request haina payment reference.' });
    }

    // ✅ Update company_payments
    const updateResult = await query(`
      UPDATE company_payments 
      SET status = 'approved',
          ceo_approved_by = $1,
          ceo_approved_at = NOW(),
          updated_at = NOW()
      WHERE reference = $2 AND status = 'pending-ceo'
      RETURNING *
    `, [user.fullName, request.payment_reference]);

    if (updateResult.length === 0) {
      return res.status(400).json({
        error: `Malipo ${request.payment_reference} hayapo kwenye status "pending-ceo".`
      });
    }

    // Update request — tayari kulipwa na Finance
    await query(`
      UPDATE procurement_requests 
      SET status = 'payment-approved',
          payment_approved_at = NOW(),
          payment_approved_by = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [user.fullName, id]);

    await logStatusChange(
      query, id, 'payment-pending-ceo', 'payment-approved',
      user, notes || 'CEO ameidhinisha malipo'
    );

    // Notify Finance — waweze kulipa
    const fins = await query(`SELECT id FROM users WHERE role = 'Finance' AND status = 'Active'`);
    for (const f of fins) {
      await notify(
        query, f.id, 'payment', '✅ Malipo Yameidhinishwa',
        `Request ${request.request_number}: CEO ameidhinisha malipo ${request.payment_reference}. Unaweza kulipa sasa.`,
        `/finance#tab-company-payments`
      );
    }

    res.json({
      success: true,
      message: 'Malipo yameidhinishwa na CEO. Finance anaweza kulipa.',
      payment_reference: request.payment_reference
    });

  } catch (err) {
    console.error('ceoApprovePayment error:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 7b. CEO REJECT PAYMENT
// ================================================================
async function ceoRejectPayment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (user.role !== 'CEO' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'CEO pekee anaweza kukataa malipo.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Sababu ya kukataa inahitajika.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'payment-pending-ceo') {
      return res.status(400).json({
        error: `Request iko kwenye status "${request.status}".`
      });
    }

    if (!request.payment_reference) {
      return res.status(400).json({ error: 'Request haina payment reference.' });
    }

    // ✅ Update company_payments
    const updateResult = await query(`
      UPDATE company_payments 
      SET status = 'rejected',
          rejected_by = $1,
          rejected_at = NOW(),
          rejection_reason = $2,
          updated_at = NOW()
      WHERE reference = $3 AND status = 'pending-ceo'
      RETURNING *
    `, [user.fullName, reason.trim(), request.payment_reference]);

    if (updateResult.length === 0) {
      return res.status(400).json({
        error: `Malipo ${request.payment_reference} hayapo kwenye status "pending-ceo".`
      });
    }

    // Update request — rudi kwa Finance
    await query(`
      UPDATE procurement_requests 
      SET status = 'payment-returned',
          rejection_stage = 'payment-ceo',
          rejection_reason = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [reason.trim(), id]);

    await logStatusChange(
      query, id, 'payment-pending-ceo', 'payment-returned',
      user, reason.trim()
    );

    // Notify Finance
    const fins = await query(`SELECT id FROM users WHERE role = 'Finance' AND status = 'Active'`);
    for (const f of fins) {
      await notify(
        query, f.id, 'payment', '❌ Malipo Yamekataliwa na CEO',
        `Request ${request.request_number}: ${reason.trim()}`,
        `/procurement/${id}`
      );
    }

    res.json({
      success: true,
      message: 'Malipo yamerudishwa kwa Finance.',
      reason: reason.trim()
    });

  } catch (err) {
    console.error('ceoRejectPayment error:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 8. FINANCE MARK AS PAID
// ================================================================
async function financeMarkAsPaid(req, res) {
  try {
    const { id } = req.params;
    const { paymentReference, notes } = req.body;
    const user = req.user;

    if (user.role !== 'Finance' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Finance pekee anaweza kuweka malipo kama yaliyolipwa.' });
    }

    if (!paymentReference || !paymentReference.trim()) {
      return res.status(400).json({ error: 'Payment reference inahitajika (mfano: M-Pesa transaction ID, bank ref).' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'payment-approved') {
      return res.status(400).json({
        error: `Request iko kwenye status "${request.status}". Inatakiwa "payment-approved".`
      });
    }

    if (!request.payment_reference) {
      return res.status(400).json({ error: 'Request haina payment reference.' });
    }

    // ✅ Update company_payments — weka kama paid
    const updateResult = await query(`
      UPDATE company_payments 
      SET status = 'paid',
          paid_by = $1,
          paid_at = NOW(),
          updated_at = NOW()
      WHERE reference = $2 AND status = 'approved'
      RETURNING *
    `, [user.fullName, request.payment_reference]);

    if (updateResult.length === 0) {
      return res.status(400).json({
        error: `Malipo ${request.payment_reference} hayapo kwenye status "approved".`
      });
    }

    // Update request — tayari paid
    await query(`
      UPDATE procurement_requests 
      SET status = 'paid',
          paid_at = NOW(),
          paid_by = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [user.fullName, id]);

    await logStatusChange(
      query, id, 'payment-approved', 'paid',
      user, `Ref: ${paymentReference.trim()}${notes ? ' | ' + notes.trim() : ''}`
    );

    // Notify Procurement — wapokee stock/asset
    const procs = await query(`SELECT id FROM users WHERE role = 'Procurement' AND status = 'Active'`);
    for (const p of procs) {
      await notify(
        query, p.id, 'procurement', '💰 Malipo Yamelipwa — Pokea Bidhaa',
        `Request ${request.request_number} imelipwa (Ref: ${paymentReference.trim()}). Pokea bidhaa kama Stock au Asset.`,
        `/procurement/${id}`
      );
    }

    res.json({
      success: true,
      message: 'Malipo yamekamilika. Procurement anaweza kupokea bidhaa.',
      payment_reference: paymentReference.trim(),
      company_payment_id: updateResult[0].id
    });

  } catch (err) {
    console.error('financeMarkAsPaid error:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 9. DOWNLOAD IMPREST PDF
// ================================================================
async function downloadImprestPDF(req, res) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT * FROM procurement_imprests WHERE request_id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Imprest not found' });

    const imprest = rows[0];
    const filePath = path.join(__dirname, '..', 'uploads', 'imprests', imprest.pdf_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'PDF not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${imprest.imprest_number}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 10. GET PAYMENT DETAILS
// ================================================================
async function getPaymentDetails(req, res) {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT * FROM procurement_payments WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return res.json(null);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 11. GET STATUS HISTORY
// ================================================================
async function getStatusHistory(req, res) {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT * FROM procurement_status_history WHERE request_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 12. HOOK: UPDATE PROCUREMENT WHEN PAYMENT IS APPROVED
// ================================================================
async function onPaymentApprovedByCeo(paymentId) {
  try {
    // Tafuta payment
    const rows = await query('SELECT * FROM company_payments WHERE id = $1', [paymentId]);
    if (rows.length === 0) return;
    const p = rows[0];

    if (p.type === 'procurement' && p.reference) {
      // Tafuta request inayohusiana
      const reqs = await query('SELECT id FROM procurement_requests WHERE payment_reference = $1', [p.reference]);
      
      if (reqs.length > 0) {
        const reqId = reqs[0].id;
        // Badilisha status kuwa payment-approved
        await query(
          `UPDATE procurement_requests 
           SET status = 'payment-approved', 
               payment_approved_at = NOW(), 
               payment_approved_by = (SELECT full_name FROM users WHERE id = $2),
               updated_at = NOW()
           WHERE id = $1`,
          [reqId, p.ceo_approved_by ? p.ceo_approved_by : null]
        );
        
        await logStatusChange(query, reqId, 'pending-payment-approval', 'payment-approved', { fullName: 'System', userId: 0, role: 'System' }, 'CEO Approved Payment');

        // Notify Finance
        const fins = await query(`SELECT id FROM users WHERE role = 'Finance' AND status = 'Active'`);
        for (const f of fins) {
          await notify(query, f.id, 'procurement', '✅ Malipo Yameidhinishwa',
            `Malipo ${p.reference} yameidhinishwa na CEO. Unaweza kulipa.`, `/finance#tab-company-payments`);
        }
      }
    }
  } catch (e) { console.error('onPaymentApprovedByCeo hook error:', e); }
}
// ================================================================
// 1. PROCUREMENT → MANAGER
// ================================================================
async function procurementForwardToManager(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'Procurement' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Procurement pekee anaweza kupitisha.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    // Ruhusu ikiwa pending au pending-procurement
    if (request.status !== 'pending' && request.status !== 'pending-procurement') {
      return res.status(400).json({ error: `Request iko kwenye status "${request.status}", haiwezi kupitishwa.` });
    }

    await query(
      `UPDATE procurement_requests SET status = 'pending-manager', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await logStatusChange(query, id, request.status, 'pending-manager', user, 'Procurement amepitisha kwa Manager');

    // Notify managers
    const managers = await query(`SELECT id FROM users WHERE role = 'Manager' AND status = 'Active'`);
    for (const m of managers) {
      await notify(query, m.id, 'procurement', '📋 Request Mpya',
        `Request ${request.request_number} inahitaji idhini yako.`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Request imepitishwa kwa Manager.' });
  } catch (err) {
    console.error('procurementForwardToManager:', err);
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 2. MANAGER → CEO
// ================================================================
async function managerApproveRequest(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    if (user.role !== 'Manager' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Manager pekee anaweza kuidhinisha.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'pending-manager') {
      return res.status(400).json({ error: `Request iko kwenye status "${request.status}".` });
    }

    await query(
      `UPDATE procurement_requests 
       SET status = 'pending-ceo', manager_approved_at = NOW(), manager_notes = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, notes || null]
    );

    await logStatusChange(query, id, 'pending-manager', 'pending-ceo', user, notes);

    // Notify CEO
    const ceos = await query(`SELECT id FROM users WHERE role = 'CEO' AND status = 'Active'`);
    for (const c of ceos) {
      await notify(query, c.id, 'procurement', '🏢 Request Inahitaji Idhini',
        `Request ${request.request_number} imepitishwa na Manager.`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Request imepitishwa kwa CEO.' });
  } catch (err) {
    console.error('managerApproveRequest:', err);
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 3. CEO → PROCUREMENT (RUDI KWA DETAILS)
// ================================================================
async function ceoApproveRequest(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    if (user.role !== 'CEO' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'CEO pekee anaweza kuidhinisha mwisho.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];
    if (request.status !== 'pending-ceo') {
      return res.status(400).json({ error: `Request iko kwenye status "${request.status}".` });
    }

    // Pata items
    const items = await query('SELECT * FROM procurement_items WHERE request_id = $1', [id]);

    // Tengeneza imprest number
    const imprestNumber = await imprestService.generateImprestNumber(query);

    // QR code data (verification URL)
    const qrText = `MAKDC-IMP-${imprestNumber}-${request.request_number}-${Date.now()}`;
    const qrCodeData = await imprestService.generateQRCode(qrText);

    // Tengeneza PDF
    const itemsForPDF = items.map(it => ({
      itemName: it.item_name,
      specification: it.specification,
      quantity: it.quantity,
      unit: it.unit,
      estimatedPrice: it.estimated_price,
    }));

    const pdfResult = await imprestService.generateImprestPDF({
      imprestNumber,
      requestNumber: request.request_number,
      department: request.department,
      requestedBy: request.requested_by,
      title: request.title,
      items: itemsForPDF,
      totalAmount: request.total_amount,
      approvedByCeo: user.fullName,
      approvedAt: new Date(),
      qrCodeData,
    });

    // Hifadhi imprest kwenye DB
    const imprestResult = await query(
      `INSERT INTO procurement_imprests 
       (imprest_number, request_id, request_number, department, requested_by, title,
        items, total_amount, approved_by_ceo, approved_by_ceo_id, qr_code_data, pdf_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        imprestNumber, id, request.request_number, request.department,
        request.requested_by, request.title, JSON.stringify(itemsForPDF),
        request.total_amount, user.fullName, user.userId, qrCodeData, pdfResult.filename,
      ]
    );

    const imprest = imprestResult[0];

    // Update request — RUDI KWA PROCUREMENT
    await query(
      `UPDATE procurement_requests 
       SET status = 'pending-purchaser-details', ceo_approved_at = NOW(),
           ceo_notes = $2, imprest_id = $3, imprest_number = $4,
           imprest_generated_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id, notes || null, imprest.id, imprestNumber]
    );

    await logStatusChange(query, id, 'pending-ceo', 'pending-purchaser-details', user, `Imprest ${imprestNumber} imetengenezwa`);

    // Notify procurement
    const procs = await query(`SELECT id FROM users WHERE role = 'Procurement' AND status = 'Active'`);
    for (const p of procs) {
      await notify(query, p.id, 'procurement', '✅ Imprest Imetengenezwa',
        `Request ${request.request_number} imeidhinishwa. Imprest: ${imprestNumber}. Jaza details za manunuzi.`,
        `/procurement/${id}`);
    }

    res.json({
      success: true,
      message: 'Request imeidhinishwa. Imprest imetengenezwa.',
      imprest: { id: imprest.id, number: imprestNumber, pdf: pdfResult.filename },
    });
  } catch (err) {
    console.error('ceoApproveRequest:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// 🆕 RECEIVE PROCUREMENT AS ASSET (Badala ya Stock)
// ================================================================
async function receiveAsAsset(req, res) {
  try {
    const { requestId } = req.params;
    const { category, serialNumber, location, usefulLifeYears } = req.body;
    const user = req.user;
    const years = parseInt(usefulLifeYears) || 5;    
    if (user.role !== 'Procurement' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Procurement pekee anaweza kufanya hivi.' });
    }
    
    const requests = await query('SELECT * FROM procurement_requests WHERE id = $1', [requestId]);
    if (requests.length === 0) return res.status(404).json({ error: 'Request not found' });
    
    const request = requests[0];
    if (request.status !== 'paid') {
      return res.status(400).json({ error: 'Request lazima iwe imelipwa (paid) kabla ya ku-receive.' });
    }
    if (request.received_as_asset) {
      return res.status(400).json({ error: 'Request hii tayari imesajiliwa kama Asset.' });
    }
    
    // Generate asset tag (AST-YYYY-NNNN)
    const year = new Date().getFullYear();
    const count = await query(
      `SELECT COUNT(*) as c FROM assets WHERE asset_tag LIKE $1`,
      [`AST-${year}-%`]
    );
    const assetTag = `AST-${year}-${String(parseInt(count[0].c) + 1).padStart(4, '0')}`;
    
    // Pata items zote za procurement hii kwa ajili ya description
    const items = await query('SELECT * FROM procurement_items WHERE request_id = $1', [requestId]);
    const itemNames = items.map(i => `${i.item_name} x${i.quantity}`).join(', ');
    
    // Unda Asset mpya
    const assetResult = await query(`
      INSERT INTO assets 
      (asset_tag, name, category, description, purchase_date, purchase_value, current_value,
       useful_life_years, depreciation_rate, location, condition, status, serial_number,
       procurement_request_id, created_by_id, created_by_name)
      VALUES ($1, $2, $3, $4, NOW(), $5, $5, $6, $7, $8, 'Good', 'Active', $9, $10, $11, $12)
      RETURNING *
    `, [
      assetTag,
      request.title || `Procurement ${request.request_number}`,
      category || 'Equipment',
      itemNames,
      request.total_amount,
      usefulLifeYears || 5,
      (100 / (usefulLifeYears || 5)).toFixed(2),  // Straight-line rate
      location || request.department,
      serialNumber || null,
      request.id,
      user.userId,
      user.fullName
    ]);
    
    const asset = assetResult[0];
    
    // Update procurement request kuwa completed na ku-link asset
    await query(`
      UPDATE procurement_requests 
      SET status = 'completed', received_as_asset = TRUE, asset_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [asset.id, requestId]);
    
    res.json({ 
      success: true, 
      message: 'Asset imesajiliwa kikamilifu!',
      asset: { id: asset.id, tag: assetTag, name: asset.name }
    });
    
  } catch (err) {
    console.error('receiveAsAsset error:', err);
    res.status(500).json({ error: err.message });
  }
}
// ================================================================
// SUPPLIERS & PURCHASE ORDERS (Zilizokosekana)
// ================================================================
async function listSuppliers(req, res) {
    try {
        const suppliers = await query(`SELECT * FROM suppliers ORDER BY name ASC`);
        res.json(suppliers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function createSupplier(req, res) {
    try {
        const { name, contactPerson, phone, email, address } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Supplier name is required' });
        }

        const existing = await query('SELECT * FROM suppliers WHERE name = $1 LIMIT 1', [name.trim()]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Supplier already exists', supplier: existing[0] });
        }

        const result = await query(`
            INSERT INTO suppliers (name, contact_person, phone, email, address)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [name.trim(), contactPerson || null, phone || null, email || null, address || null]);

        res.status(201).json(result[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function listPurchaseOrders(req, res) {
    try {
        const orders = await query(`
            SELECT po.*, s.name AS supplier_name,
                   (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) AS item_count
            FROM purchase_orders po
            LEFT JOIN suppliers s ON s.id = po.supplier_id
            ORDER BY po.created_at DESC
        `);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function createPurchaseOrder(req, res) {
    try {
        const { supplierId, supplierName, orderNumber, notes, items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one purchase order item is required' });
        }

        let resolvedSupplierId = supplierId || null;
        if (!resolvedSupplierId && supplierName) {
            const existingSupplier = await query('SELECT * FROM suppliers WHERE name = $1 LIMIT 1', [supplierName.trim()]);
            if (existingSupplier.length > 0) {
                resolvedSupplierId = existingSupplier[0].id;
            } else {
                const supplierResult = await query('INSERT INTO suppliers (name) VALUES ($1) RETURNING *', [supplierName.trim()]);
                resolvedSupplierId = supplierResult[0].id;
            }
        }

        const totalAmount = items.reduce((sum, item) => {
            return sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0));
        }, 0);

        const orderResult = await query(`
            INSERT INTO purchase_orders (order_number, supplier_id, status, total_amount, notes)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [orderNumber || `PO-${Date.now()}`, resolvedSupplierId, 'draft', totalAmount, notes || null]);

        const purchaseOrder = orderResult[0];

        for (const item of items) {
            const qty = Number(item.quantity || 0);
            const unitPrice = Number(item.unitPrice || 0);
            const total = Number((qty * unitPrice).toFixed(2));

            await query(`
                INSERT INTO purchase_order_items (purchase_order_id, item_name, specification, quantity, unit, unit_price, total)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [purchaseOrder.id, item.itemName, item.specification || null, qty, item.unit || 'pcs', unitPrice, total]);
        }

        res.status(201).json({ message: 'Purchase order created successfully', purchaseOrder });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// 🆕 RECEIVE STOCK (Department)
// ================================================================
async function getPendingReceives(req, res) {
    try {
        const movements = await query(`
            SELECT t.*, s.item_name, s.unit as item_unit 
            FROM stock_transactions t
            JOIN stock_items s ON t.stock_item_id = s.id
            WHERE t.transaction_type = 'out' AND (t.is_received = false OR t.is_received IS NULL)
            ORDER BY t.created_at DESC
        `);
        res.json(movements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function confirmReceive(req, res) {
    try {
        const { id } = req.params;
        const user = req.user;

        // Badilisha status ya movement
        const result = await query(`
            UPDATE stock_transactions 
            SET is_received = true, received_at = NOW(), received_by = $1 
            WHERE id = $2 AND transaction_type = 'out'
            RETURNING *
        `, [user.fullName, id]);

        if (result.length === 0) {
            return res.status(404).json({ error: 'Pending receive not found' });
        }

        res.json({ success: true, message: 'Stock received successfully' });
    } catch (err) {
        console.error('confirmReceive error:', err);
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// ASSET MAINTENANCE & RETIREMENT
// ================================================================

// 1. GET ALL MAINTENANCE LOGS
async function getAllMaintenance(req, res) {
    try {
        const logs = await query(`
            SELECT m.*, a.name as asset_name, a.asset_tag 
            FROM asset_maintenance m
            JOIN assets a ON m.asset_id = a.id
            ORDER BY m.created_at DESC
        `);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
// 2. ADD MAINTENANCE RECORD
async function createMaintenance(req, res) {
    try {
        const { id } = req.params; // assetId
        const { type, description, cost, performedBy, scheduledDate, status, notes } = req.body;
        const user = req.user;

        // 🆕 Nimeongeza created_at na updated_at hapa
        const result = await query(`
            INSERT INTO asset_maintenance 
            (asset_id, type, description, cost, performed_by, scheduled_date, status, notes, created_by_id, created_by_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *
        `, [id, type || 'routine', description, cost || 0, performedBy, scheduledDate || null, status || 'pending', notes || null, user.userId, user.fullName]);

        // Kama maintenance inaendelea, badilisha status ya Asset
        if (status === 'in-progress') {
            await query(`UPDATE assets SET status = 'In Maintenance', updated_at = NOW() WHERE id = $1`, [id]);
        }

        res.status(201).json(result[0]);
    } catch (err) {
        console.error('createMaintenance error:', err);
        res.status(500).json({ error: err.message });
    }
}
// 3. RETIRE ASSET
async function retireAsset(req, res) {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ error: 'Sababu ya kustaafisha inahitajika' });

        await query(`
            UPDATE assets 
            SET status = 'Retired', notes = CONCAT(COALESCE(notes, ''), '\n[RETIRED]: ', $1), updated_at = NOW()
            WHERE id = $2
        `, [reason, id]);

        res.json({ success: true, message: 'Asset imestaafishwa kikamilifu.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    listAllRequests,
    listIncomingRequests,
    listRemedialRequests,
    listPendingRequests,
    listApprovedRequests,
    listPaidProcurements,
    getRequestById, // <--- Hii ni muhimu sana
    createRequest,
    updateStatus,
    listStockItems,
    addStockItem,
     getPendingReceives,
    confirmReceive,
    getStockSummary,
    getLowStockItems,
    adjustStockItem,
    listSuppliers,
    createSupplier,
    listPurchaseOrders,
    createPurchaseOrder,
    receiveStockFromProcurement,
    stockOut,
    getRequestMessages,
    sendRequestMessage,
    saveRequestFollowUp,
    markMessagesAsRead,
    setTypingStatus,
    getTypingStatus,
    // Workflow
    procurementForwardToManager,
    managerApproveRequest,
    managerRejectRequest,
    getStockItemById, 
    ceoApproveRequest,
    listStockMovements,
    ceoRejectRequest,
    submitPurchaserDetails,
    // Payment
    financeVerifyAndSendToManager,
    managerApprovePayment,
    managerRejectPayment,
    ceoApprovePayment,
    ceoRejectPayment,
    financeMarkAsPaid,
    // Imprest
    downloadImprestPDF,
    getPaymentDetails,
    receiveAsAsset,
    getStatusHistory,

    getAllMaintenance,
    createMaintenance,
    retireAsset,
    getFuelLogs,
    issueFuel

};