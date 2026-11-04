const { query } = require('../db');

// 1. LIST TENDERS (Zote)
async function listTenders(req, res) {
    try {
        const { status } = req.query;
        let sql = `SELECT * FROM tenders WHERE 1=1`;
        const params = [];
        let idx = 1;

        if (status) {
            sql += ` AND status = $${idx++}`;
            params.push(status);
        }
        sql += ` ORDER BY created_at DESC`;

        const tenders = await query(sql, params);
        res.json(tenders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// 2. GET SINGLE TENDER
async function getTenderById(req, res) {
    try {
        const { id } = req.params;
        const rows = await query('SELECT * FROM tenders WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Tender haipo' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// 3. CREATE TENDER (Kupokea Tenda Mpya)
async function createTender(req, res) {
    try {
        const user = req.user;
        const {
            title, description, clientName, category, location,
            publishedDate, submissionDate, estimatedBudget, status, notes, documents
        } = req.body;

        if (!title) return res.status(400).json({ error: 'Jina la tender ni lazima' });

        // Tengeneza Tender Number (TND-YYYY-NNN)
        const year = new Date().getFullYear();
        const countRes = await query(`SELECT COUNT(*) as c FROM tenders WHERE tender_number LIKE $1`, [`TND-${year}-%`]);
        const nextCount = String(parseInt(countRes[0].c) + 1).padStart(3, '0');
        const tenderNumber = `TND-${year}-${nextCount}`;

        const result = await query(`
            INSERT INTO tenders (
                tender_number, title, description, client_name, category, location,
                published_date, submission_date, estimated_budget, status, notes, documents,
                created_by_id, created_by_name, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
            RETURNING *
        `, [
            tenderNumber, title, description || null, clientName || null, category || null, location || null,
            publishedDate || null, submissionDate || null, estimatedBudget || 0, status || 'incoming', notes || null, JSON.stringify(documents || []),
            user.userId, user.fullName
        ]);

        res.status(201).json(result[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// 4. UPDATE TENDER
async function updateTender(req, res) {
    try {
        const { id } = req.params;
        const { 
            title, description, clientName, category, location, 
            publishedDate, submissionDate, awardedDate, estimatedBudget, awardedAmount, 
            status, notes, documents 
        } = req.body;

        const result = await query(`
            UPDATE tenders SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                client_name = COALESCE($3, client_name),
                category = COALESCE($4, category),
                location = COALESCE($5, location),
                published_date = COALESCE($6, published_date),
                submission_date = COALESCE($7, submission_date),
                awarded_date = COALESCE($8, awarded_date),
                estimated_budget = COALESCE($9, estimated_budget),
                awarded_amount = COALESCE($10, awarded_amount),
                status = COALESCE($11, status),
                notes = COALESCE($12, notes),
                documents = COALESCE($13, documents),
                updated_at = NOW()
            WHERE id = $14 RETURNING *
        `, [
            title, description, clientName, category, location,
            publishedDate, submissionDate, awardedDate, estimatedBudget, awardedAmount,
            status, notes, documents ? JSON.stringify(documents) : null, id
        ]);

        if (result.length === 0) return res.status(404).json({ error: 'Tender haipo' });
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// 5. LINK TENDER TO PROCUREMENT (Tenda Imeshindwa -> Tuma kwa Procurement)
async function linkToProcurement(req, res) {
    try {
        const { id } = req.params;
        const user = req.user;

        const tender = await query('SELECT * FROM tenders WHERE id = $1', [id]);
        if (tender.length === 0) return res.status(404).json({ error: 'Tender haipo' });

        const t = tender[0];
        if (t.status !== 'won') {
            return res.status(400).json({ error: 'Tender hii haijashindwa. Badilisha status kuwa "Won" kwanza.' });
        }

        if (t.procurementId) {
            return res.status(400).json({ error: 'Tender hii tayari imeunganishwa na Procurement Request.' });
        }

        // 🆕 Tengeneza Procurement Request kiotomatiki
        const year = new Date().getFullYear();
        const countRes = await query(`SELECT COUNT(*) as c FROM procurement_requests WHERE request_number LIKE $1`, [`PR-${year}-%`]);
        const nextCount = String(parseInt(countRes[0].c) + 1).padStart(3, '0');
        const requestNumber = `PR-${year}-${nextCount}`;

        // Unda request mpya (Tender title inakuwa request title)
        const requestResult = await query(`
            INSERT INTO procurement_requests 
            (request_number, department, requested_by, requested_by_id, status, total_amount, notes, title, urgency, item_count, created_at, updated_at)
            VALUES ($1, 'Procurement', $2, $3, 'pending-procurement', $4, $5, $6, 'normal', 1, NOW(), NOW())
            RETURNING *
        `, [
            requestNumber, 
            user.fullName, 
            user.userId, 
            t.awarded_amount || t.estimated_budget || 0, 
            `Imefunguliwa kutoka Tender: ${t.tender_number} - ${t.title}`, 
            `Manunuzi kwa ajili ya Tender: ${t.title}`
        ]);

        const newRequest = requestResult[0];

        // Unda item ya kwanza (Tender inakuwa item moja kwa urahisi)
        await query(`
            INSERT INTO procurement_items 
            (request_id, item_name, specification, quantity, unit, estimated_price, notes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
            newRequest.id,
            t.title, // Jina la tender ndio item
            t.description || null,
            1,
            'lot',
            t.awarded_amount || t.estimated_budget || 0,
            `Tender Ref: ${t.tender_number}`
        ]);
        // Sasisha Tender kuwa imeunganishwa
        await query(`
            UPDATE tenders 
            SET status = 'won', procurement_id = $1, updated_at = NOW() 
            WHERE id = $2
        `, [newRequest.id, id]);

        res.json({ 
            success: true, 
            message: 'Procurement Request imeundwa kiotomatiki!',
            procurement: { id: newRequest.id, number: requestNumber }
        });
    } catch (err) {
        console.error('linkToProcurement error:', err);
        res.status(500).json({ error: err.message });
    }
}
// 6. DELETE TENDER
async function deleteTender(req, res) {
    try {
        const { id } = req.params;
        await query('DELETE FROM tenders WHERE id = $1', [id]);
        res.json({ success: true, message: 'Tender imefutwa' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    listTenders,
    getTenderById,
    createTender,
    updateTender,
    linkToProcurement,
    deleteTender
};