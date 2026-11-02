// ================================================================
// MAK DC INVESTMENT — PROCUREMENT CONTROLLER (PATCHED)
// ================================================================
// Inatumia: pg (raw SQL) — sio Prisma
// JWT payload: { userId, email, role, fullName }
// ================================================================

const { query } = require('../db');

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

        const requestNumber = 'PR-' + Date.now();
        const isProcurement = user.role === 'Procurement';
        const initialStatus = isProcurement ? 'pending-procurement' : 'pending';
        const totalAmount = items.reduce((sum, item) => 
            sum + (parseFloat(item.estimatedPrice) || 0) * (parseInt(item.quantity) || 0), 0);

        // 🆕 Fix: Tumia user.userId (sio user.id)
        const requestResult = await query(`
            INSERT INTO procurement_requests 
            (request_number, department, requested_by, requested_by_id, status, total_amount, notes, title, urgency, required_by, attachments, item_count)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
                (request_id, item_name, specification, quantity, unit, estimated_price, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
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
// STOCK ITEMS
// ================================================================
async function listStockItems(req, res) {
    try {
        const items = await query('SELECT * FROM stock_items ORDER BY item_name');
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function addStockItem(req, res) {
    try {
        const { itemName, category, specification, quantity, unit, unitPrice, minStockLevel, location } = req.body;
        const result = await query(`
            INSERT INTO stock_items 
            (item_name, category, specification, quantity, unit, unit_price, min_stock_level, location)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [itemName, category, specification, quantity, unit, unitPrice, minStockLevel || 10, location]);
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// RECEIVE STOCK FROM PROCUREMENT
// ================================================================
async function receiveStockFromProcurement(req, res) {
    try {
        const { requestId } = req.params;
        const user = req.user;
        
        const requests = await query('SELECT * FROM procurement_requests WHERE id = $1', [requestId]);
        if (requests.length === 0) return res.status(404).json({ error: 'Request not found' });
        
        const request = requests[0];
        if (request.status !== 'paid') {
            return res.status(400).json({ error: 'Request must be paid before receiving stock' });
        }
        
        const items = await query('SELECT * FROM procurement_items WHERE request_id = $1', [requestId]);
        
        for (const item of items) {
            const existing = await query(
                'SELECT * FROM stock_items WHERE item_name = $1 AND specification = $2',
                [item.item_name, item.specification || '']
            );
            
            if (existing.length > 0) {
                await query(`
                    UPDATE stock_items 
                    SET quantity = quantity + $1, updated_at = NOW() 
                    WHERE id = $2
                `, [item.quantity, existing[0].id]);
                
                await query(`
                    INSERT INTO stock_transactions 
                    (stock_item_id, transaction_type, quantity, reference, request_id, performed_by, performed_by_id)
                    VALUES ($1, 'in', $2, $3, $4, $5, $6)
                `, [existing[0].id, item.quantity, request.request_number, request.id, user.fullName, user.userId]);
                
            } else {
                const newItem = await query(`
                    INSERT INTO stock_items 
                    (item_name, category, specification, quantity, unit, unit_price)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                `, [item.item_name, 'Procurement', item.specification, item.quantity, item.unit, item.estimated_price]);
                
                await query(`
                    INSERT INTO stock_transactions 
                    (stock_item_id, transaction_type, quantity, reference, request_id, performed_by, performed_by_id)
                    VALUES ($1, 'in', $2, $3, $4, $5, $6)
                `, [newItem[0].id, item.quantity, request.request_number, request.id, user.fullName, user.userId]);
            }
        }
        
        await query(`
            UPDATE procurement_requests 
            SET status = 'completed', updated_at = NOW() 
            WHERE id = $1
        `, [requestId]);
        
        res.json({ message: 'Stock received successfully', requestId });
        
    } catch (err) {
        console.error('Receive stock error:', err);
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// STOCK OUT
// ================================================================
async function stockOut(req, res) {
    try {
        const { stockItemId, quantity, department, notes } = req.body;
        const user = req.user;
        
        const items = await query('SELECT * FROM stock_items WHERE id = $1', [stockItemId]);
        if (items.length === 0) return res.status(404).json({ error: 'Stock item not found' });
        
        const item = items[0];
        if (item.quantity < quantity) {
            return res.status(400).json({ error: `Insufficient stock. Available: ${item.quantity}` });
        }
        
        await query(`
            UPDATE stock_items 
            SET quantity = quantity - $1, updated_at = NOW() 
            WHERE id = $2
        `, [quantity, stockItemId]);
        
        await query(`
            INSERT INTO stock_transactions 
            (stock_item_id, transaction_type, quantity, notes, performed_by, performed_by_id)
            VALUES ($1, 'out', $2, $3, $4, $5)
        `, [stockItemId, quantity, `${department} - ${notes || ''}`, user.fullName, user.userId]);
        
        res.json({ message: 'Stock issued successfully' });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// STOCK TRANSACTIONS HISTORY
// ================================================================
async function listStockTransactions(req, res) {
    try {
        const transactions = await query(`
            SELECT t.*, s.item_name, s.unit
            FROM stock_transactions t
            LEFT JOIN stock_items s ON t.stock_item_id = s.id
            ORDER BY t.created_at DESC
            LIMIT 100
        `);
        res.json(transactions);
    } catch (err) {
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
// 6. MANAGER APPROVE / REJECT PAYMENT
// ================================================================
async function managerApprovePayment(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    if (user.role !== 'Manager' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Manager pekee.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'payment-pending-manager') {
      return res.status(400).json({ error: `Status: ${rows[0].status}` });
    }

    await query(
      `UPDATE procurement_payments 
       SET status = 'pending-ceo', manager_verified_by = $2, manager_verified_at = NOW(), updated_at = NOW()
       WHERE request_id = $1 AND status = 'pending-manager'`,
      [id, user.fullName]
    );

    await query(
      `UPDATE procurement_requests SET status = 'payment-pending-ceo', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await logStatusChange(query, id, 'payment-pending-manager', 'payment-pending-ceo', user, notes);

    // Notify CEO
    const ceos = await query(`SELECT id FROM users WHERE role = 'CEO' AND status = 'Active'`);
    for (const c of ceos) {
      await notify(query, c.id, 'procurement', '💸 Malipo Yanahitaji Idhini',
        `Request ${rows[0].request_number}: Malipo yamepitishwa na Manager.`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Malipo yamepitishwa kwa CEO.' });
  } catch (err) {
    console.error('managerApprovePayment:', err);
    res.status(500).json({ error: err.message });
  }
}

async function managerRejectPayment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (!reason) return res.status(400).json({ error: 'Sababu inahitajika.' });

    await query(
      `UPDATE procurement_payments 
       SET status = 'rejected', rejected_by = $2, rejected_at = NOW(), rejection_reason = $3, updated_at = NOW()
       WHERE request_id = $1 AND status = 'pending-manager'`,
      [id, user.fullName, reason]
    );

    await query(
      `UPDATE procurement_requests 
       SET status = 'payment-returned', rejection_stage = 'payment-manager', rejection_reason = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, reason]
    );

    await logStatusChange(query, id, 'payment-pending-manager', 'payment-returned', user, reason);

    // Notify finance
    const fins = await query(`SELECT id FROM users WHERE role = 'Finance' AND status = 'Active'`);
    const req = await query('SELECT request_number FROM procurement_requests WHERE id = $1', [id]);
    for (const f of fins) {
      await notify(query, f.id, 'procurement', '❌ Malipo Yamekataliwa',
        `Request ${req[0].request_number}: ${reason}`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Malipo yamerudishwa kwa Finance.' });
  } catch (err) {
    console.error('managerRejectPayment:', err);
    res.status(500).json({ error: err.message });
  }
}

// ================================================================
// 7. CEO APPROVE / REJECT PAYMENT
// ================================================================
async function ceoApprovePayment(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    if (user.role !== 'CEO' && user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'CEO pekee.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'payment-pending-ceo') {
      return res.status(400).json({ error: `Status: ${rows[0].status}` });
    }

    await query(
      `UPDATE procurement_payments 
       SET status = 'approved', ceo_approved_by = $2, ceo_approved_at = NOW(), updated_at = NOW()
       WHERE request_id = $1 AND status = 'pending-ceo'`,
      [id, user.fullName]
    );

    await query(
      `UPDATE procurement_requests 
       SET status = 'payment-approved', payment_approved_at = NOW(), payment_approved_by = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, user.fullName]
    );

    await logStatusChange(query, id, 'payment-pending-ceo', 'payment-approved', user, notes);

    // Notify finance
    const fins = await query(`SELECT id FROM users WHERE role = 'Finance' AND status = 'Active'`);
    for (const f of fins) {
      await notify(query, f.id, 'procurement', '✅ Malipo Yameidhinishwa',
        `Request ${rows[0].request_number}: CEO ameidhinisha. Unaweza kulipa.`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Malipo yameidhinishwa na CEO.' });
  } catch (err) {
    console.error('ceoApprovePayment:', err);
    res.status(500).json({ error: err.message });
  }
}

async function ceoRejectPayment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (!reason) return res.status(400).json({ error: 'Sababu inahitajika.' });

    await query(
      `UPDATE procurement_payments 
       SET status = 'rejected', rejected_by = $2, rejected_at = NOW(), rejection_reason = $3, updated_at = NOW()
       WHERE request_id = $1 AND status = 'pending-ceo'`,
      [id, user.fullName, reason]
    );

    await query(
      `UPDATE procurement_requests 
       SET status = 'payment-returned', rejection_stage = 'payment-ceo', rejection_reason = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, reason]
    );

    await logStatusChange(query, id, 'payment-pending-ceo', 'payment-returned', user, reason);

    const fins = await query(`SELECT id FROM users WHERE role = 'Finance' AND status = 'Active'`);
    const req = await query('SELECT request_number FROM procurement_requests WHERE id = $1', [id]);
    for (const f of fins) {
      await notify(query, f.id, 'procurement', '❌ Malipo Yamekataliwa na CEO',
        `Request ${req[0].request_number}: ${reason}`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Malipo yamerudishwa kwa Finance.' });
  } catch (err) {
    console.error('ceoRejectPayment:', err);
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
      return res.status(403).json({ error: 'Finance pekee.' });
    }

    if (!paymentReference) {
      return res.status(400).json({ error: 'Payment reference inahitajika.' });
    }

    const rows = await query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'payment-approved') {
      return res.status(400).json({ error: `Status: ${rows[0].status}` });
    }

    await query(
      `UPDATE procurement_payments 
       SET status = 'paid', paid_by = $2, paid_at = NOW(), payment_reference = $3, updated_at = NOW()
       WHERE request_id = $1 AND status = 'approved'`,
      [id, user.fullName, paymentReference]
    );

    await query(
      `UPDATE procurement_requests 
       SET status = 'paid', paid_at = NOW(), paid_by = $2, payment_reference = $3, updated_at = NOW()
       WHERE id = $1`,
      [id, user.fullName, paymentReference]
    );

    await logStatusChange(query, id, 'payment-approved', 'paid', user, `Ref: ${paymentReference}`);

    // Notify procurement (receive stock)
    const procs = await query(`SELECT id FROM users WHERE role = 'Procurement' AND status = 'Active'`);
    for (const p of procs) {
      await notify(query, p.id, 'procurement', '✅ Malipo Yamelipwa',
        `Request ${rows[0].request_number} imelipwa. Pokea stock.`, `/procurement/${id}`);
    }

    res.json({ success: true, message: 'Malipo yamekamilika.' });
  } catch (err) {
    console.error('financeMarkAsPaid:', err);
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
    receiveStockFromProcurement,
    stockOut,
    listStockTransactions,
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
    ceoApproveRequest,
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
    getStatusHistory
};