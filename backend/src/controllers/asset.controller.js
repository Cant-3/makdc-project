// ================================================================
// MAK DC INVESTMENT — ASSET CONTROLLER
// ================================================================
// Handles: Assets CRUD, Maintenance, Depreciation
// Access: Procurement (write), Manager/CEO/Finance (read), SuperAdmin (all)
// ================================================================

const { query, execute } = require('../db');
const QRCode = require('qrcode');
// ================================================================
// HELPER: Role check
// ================================================================
function canWrite(user) {
    return user.role === 'Procurement' || user.role === 'SuperAdmin';
}

function isSuperAdmin(user) {
    return user.role === 'SuperAdmin';
}

// ================================================================
// HELPER: Generate asset tag (AST-YYYY-NNNN)
// ================================================================
async function generateAssetTag() {
    const year = new Date().getFullYear();
    const prefix = `AST-${year}-`;
    
    const rows = await query(
        `SELECT asset_tag FROM assets 
         WHERE asset_tag LIKE $1 
         ORDER BY asset_tag DESC 
         LIMIT 1`,
        [`${prefix}%`]
    );
    
    let nextNum = 1;
    if (rows.length > 0) {
        const lastTag = rows[0].asset_tag;
        const lastNum = parseInt(lastTag.replace(prefix, ''), 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// ================================================================
// HELPER: Calculate current value (straight-line depreciation)
// ================================================================
function calculateCurrentValue(asset) {
    if (!asset.purchase_date || !asset.purchase_value) {
        return Number(asset.current_value || asset.purchase_value || 0);
    }
    
    const purchaseDate = new Date(asset.purchase_date);
    const now = new Date();
    
    // Years elapsed (kwa decimal, hata miezi inahesabiwa)
    const yearsElapsed = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (yearsElapsed <= 0) return Number(asset.purchase_value);
    
    const purchaseValue = Number(asset.purchase_value);
    const salvageValue = Number(asset.salvage_value || 0);
    const usefulLife = Number(asset.useful_life_years || 5);
    
    // Straight-line: (purchase - salvage) / useful life
    const annualDep = (purchaseValue - salvageValue) / usefulLife;
    const totalDep = annualDep * yearsElapsed;
    
    let currentValue = purchaseValue - totalDep;
    if (currentValue < salvageValue) currentValue = salvageValue;
    
    return Math.round(currentValue * 100) / 100;
}

// ================================================================
// 1. LIST ALL ASSETS (with filters + search)
// ================================================================
async function listAssets(req, res) {
    try {
        const { category, status, location, search } = req.query;
        
        let sql = `SELECT * FROM assets WHERE 1=1`;
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
        if (location) {
            sql += ` AND location ILIKE $${idx++}`;
            params.push(`%${location}%`);
        }
        if (search) {
            sql += ` AND (
                name ILIKE $${idx} OR 
                asset_tag ILIKE $${idx} OR 
                serial_number ILIKE $${idx} OR
                custodian_name ILIKE $${idx}
            )`;
            params.push(`%${search}%`);
            idx++;
        }
        
        sql += ` ORDER BY created_at DESC`;
        
        const assets = await query(sql, params);
        
        // Recalculate current_value live kwa kila asset
        const enriched = assets.map(a => ({
            ...a,
            current_value: calculateCurrentValue(a)
        }));
        
        res.json(enriched);
    } catch (err) {
        console.error('listAssets error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 2. GET SINGLE ASSET (with maintenance + depreciation history)
// ================================================================
async function getAssetById(req, res) {
    try {
        const { id } = req.params;
        
        const assets = await query(`SELECT * FROM assets WHERE id = $1`, [id]);
        if (assets.length === 0) {
            return res.status(404).json({ error: 'Asset haipo.' });
        }
        
        const asset = assets[0];
        asset.current_value = calculateCurrentValue(asset);
        
        const maintenance = await query(
            `SELECT * FROM asset_maintenance 
             WHERE asset_id = $1 
             ORDER BY created_at DESC`,
            [id]
        );
        
        const depreciation = await query(
            `SELECT * FROM asset_depreciation_logs 
             WHERE asset_id = $1 
             ORDER BY year DESC`,
            [id]
        );
        
        res.json({ ...asset, maintenance, depreciation });
    } catch (err) {
        console.error('getAssetById error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 3. CREATE ASSET
// ================================================================
async function createAsset(req, res) {
    try {
        const {
            name, category, description, serialNumber, model, manufacturer,
            purchaseDate, purchaseValue, currentValue, salvageValue,
            usefulLifeYears, location, department, custodianName,
            condition, status, supplier, invoiceNumber, notes
        } = req.body;

        const user = req.user;

        // 1. Tengeneza Asset Tag (Mfano: AST-2026-0001)
        const year = new Date().getFullYear();
        const countRes = await query(
            `SELECT COUNT(*) as c FROM assets WHERE asset_tag LIKE $1`,
            [`AST-${year}-%`]
        );
        const nextCount = String(parseInt(countRes[0].c) + 1).padStart(4, '0');
        const assetTag = `AST-${year}-${nextCount}`;

        // 2. Tengeneza QR Code (Inahifadhiwa kama Base64 Image)
        // Unaweza kubadilisha qrData iwe URL ya mfumo wako baadaye
        const qrData = JSON.stringify({ tag: assetTag, name: name, company: 'MAK DC' });
        const qrCodeBase64 = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

        // 3. Hesabu Depreciation Rate (Straight Line)
        const life = parseInt(usefulLifeYears) || 5;
        const depreciationRate = (100 / life).toFixed(2);

        // 4. Insert kwenye Database
        const result = await query(`
            INSERT INTO assets (
                asset_tag, name, category, description, serial_number, model, manufacturer,
                purchase_date, purchase_value, current_value, salvage_value,
                useful_life_years, depreciation_rate, location, department, custodian_name,
                condition, status, supplier, invoice_number, notes, qr_code,
                created_by_id, created_by_name, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW()
            ) RETURNING *
        `, [
            assetTag, name, category, description || null, serialNumber || null, model || null, manufacturer || null,
            purchaseDate || null, purchaseValue || 0, currentValue || purchaseValue || 0, salvageValue || 0,
            life, depreciationRate, location || null, department || null, custodianName || null,
            condition || 'Good', status || 'Active', supplier || null, invoiceNumber || null, notes || null, qrCodeBase64,
            user.userId, user.fullName
        ]);

        res.status(201).json(result[0]);

    } catch (err) {
        console.error('createAsset error:', err);
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// 4. UPDATE ASSET
// ================================================================
async function updateAsset(req, res) {
    try {
        const user = req.user;
        if (!canWrite(user)) {
            return res.status(403).json({ error: 'Procurement pekee anaweza kuhariri assets.' });
        }
        
        const { id } = req.params;
        
        const existing = await query(`SELECT id FROM assets WHERE id = $1`, [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Asset haipo.' });
        }
        
        const allowed = [
            'name', 'category', 'description', 'serial_number', 'model', 'manufacturer',
            'purchase_date', 'purchase_value', 'salvage_value', 'useful_life_years',
            'location', 'department', 'custodian_name', 'custodian_id',
            'condition', 'status', 'warranty_expiry', 'supplier', 'invoice_number', 'notes', 'attachments'
        ];
        
        const sets = [];
        const params = [];
        let idx = 1;
        
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                sets.push(`${key} = $${idx++}`);
                if (key === 'attachments') {
                    params.push(JSON.stringify(req.body[key] || []));
                } else {
                    params.push(req.body[key]);
                }
            }
        }
        
        if (sets.length === 0) {
            return res.status(400).json({ error: 'Hakuna kitu cha ku-update.' });
        }
        
        // Recalculate current_value if purchase_value au useful_life imebadilika
        if (req.body.purchase_value !== undefined || req.body.useful_life_years !== undefined) {
            const fresh = await query(`SELECT * FROM assets WHERE id = $1`, [id]);
            const asset = fresh[0];
            const updated = { ...asset, ...req.body };
            const newCurrent = calculateCurrentValue(updated);
            sets.push(`current_value = $${idx++}`);
            params.push(newCurrent);
        }
        
        params.push(id);
        const sql = `UPDATE assets SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`;
        
        const result = await query(sql, params);
        res.json(result[0]);
    } catch (err) {
        console.error('updateAsset error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 5. RETIRE ASSET
// ================================================================
async function retireAsset(req, res) {
    try {
        const user = req.user;
        if (!canWrite(user)) {
            return res.status(403).json({ error: 'Procurement pekee.' });
        }
        
        const { id } = req.params;
        const { reason, status } = req.body;
        
        const validStatuses = ['Retired', 'Disposed', 'Lost'];
        const newStatus = validStatuses.includes(status) ? status : 'Retired';
        
        const result = await query(
            `UPDATE assets 
             SET status = $1, notes = COALESCE(notes, '') || $2
             WHERE id = $3 
             RETURNING *`,
            [newStatus, reason ? `\n[${newStatus} ${new Date().toISOString().slice(0,10)}] ${reason}` : '', id]
        );
        
        if (result.length === 0) {
            return res.status(404).json({ error: 'Asset haipo.' });
        }
        
        res.json({ success: true, asset: result[0], message: `Asset imewekwa kama ${newStatus}.` });
    } catch (err) {
        console.error('retireAsset error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 6. DELETE ASSET (SuperAdmin pekee)
// ================================================================
async function deleteAsset(req, res) {
    try {
        const user = req.user;
        if (!isSuperAdmin(user)) {
            return res.status(403).json({ error: 'SuperAdmin pekee anaweza kufuta assets.' });
        }
        
        const { id } = req.params;
        const result = await query(`DELETE FROM assets WHERE id = $1 RETURNING id`, [id]);
        
        if (result.length === 0) {
            return res.status(404).json({ error: 'Asset haipo.' });
        }
        
        res.json({ success: true, message: 'Asset imefutwa kabisa.' });
    } catch (err) {
        console.error('deleteAsset error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 7. ASSET STATS (dashboard cards)
// ================================================================
async function getAssetStats(req, res) {
    try {
        const totals = await query(`
            SELECT 
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'Active')::int AS active,
                COUNT(*) FILTER (WHERE status = 'In Maintenance')::int AS in_maintenance,
                COUNT(*) FILTER (WHERE status = 'Retired')::int AS retired,
                COALESCE(SUM(purchase_value), 0)::numeric AS total_purchase_value,
                COALESCE(SUM(current_value), 0)::numeric AS total_current_value
            FROM assets
        `);
        
        const row = totals[0] || {};
        
        res.json({
            total: Number(row.total || 0),
            active: Number(row.active || 0),
            inMaintenance: Number(row.in_maintenance || 0),
            retired: Number(row.retired || 0),
            totalPurchaseValue: Number(row.total_purchase_value || 0),
            totalCurrentValue: Number(row.total_current_value || 0),
            totalDepreciation: Number(row.total_purchase_value || 0) - Number(row.total_current_value || 0)
        });
    } catch (err) {
        console.error('getAssetStats error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 8. GET CATEGORIES (for dropdown)
// ================================================================
async function getCategories(req, res) {
    try {
        const rows = await query(`
            SELECT DISTINCT category FROM assets 
            WHERE category IS NOT NULL 
            ORDER BY category
        `);
        const defaults = ['Vehicle', 'Equipment', 'Furniture', 'Electronics', 'Building', 'Tool', 'Other'];
        const used = rows.map(r => r.category);
        const merged = Array.from(new Set([...defaults, ...used]));
        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 9. LIST MAINTENANCE (ya asset moja)
// ================================================================
async function listMaintenance(req, res) {
    try {
        const { id } = req.params;
        const rows = await query(
            `SELECT * FROM asset_maintenance 
             WHERE asset_id = $1 
             ORDER BY created_at DESC`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 9b. LIST ALL MAINTENANCE (cross-asset, for the main log tab)
// ================================================================
async function listAllMaintenance(req, res) {
    try {
        const rows = await query(`
            SELECT m.*, a.asset_tag, a.name AS asset_name, a.category
            FROM asset_maintenance m
            JOIN assets a ON a.id = m.asset_id
            ORDER BY m.created_at DESC
            LIMIT 200
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
// 10. CREATE MAINTENANCE
async function createMaintenance(req, res) {
    try {
        const user = req.user;
        if (!canWrite(user)) {
            return res.status(403).json({ error: 'Procurement pekee.' });
        }
        
        const { id } = req.params;
        const {
            type, description, cost, performedBy,
            scheduledDate, completedDate, status, nextDueDate, notes, attachments
        } = req.body;
        
        if (!description || !description.trim()) {
            return res.status(400).json({ error: 'Maelezo (description) yanahitajika.' });
        }
        
        const assetExists = await query(`SELECT id FROM assets WHERE id = $1`, [id]);
        if (assetExists.length === 0) {
            return res.status(404).json({ error: 'Asset haipo.' });
        }
        
        // 🆕 Nimeongeza created_at na updated_at hapa
        const result = await query(
            `INSERT INTO asset_maintenance (
                asset_id, type, description, cost, performed_by,
                scheduled_date, completed_date, status, next_due_date, notes, attachments,
                created_by_id, created_by_name, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
            RETURNING *`,
            [
                id,
                type || 'routine',
                description.trim(),
                cost ? Number(cost) : null,
                performedBy || null,
                scheduledDate || null,
                completedDate || null,
                status || 'pending',
                nextDueDate || null,
                notes || null,
                JSON.stringify(attachments || []),
                user.userId, user.fullName
            ]
        );
        
        // Kama completed, update asset status
        if ((status || 'pending') === 'completed') {
            await query(
                `UPDATE assets SET status = 'Active', updated_at = NOW() WHERE id = $1 AND status = 'In Maintenance'`,
                [id]
            );
        } else if (status === 'in-progress') {
            await query(
                `UPDATE assets SET status = 'In Maintenance', updated_at = NOW() WHERE id = $1`,
                [id]
            );
        }
        
        res.status(201).json(result[0]);
    } catch (err) {
        console.error('createMaintenance error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 11. UPDATE MAINTENANCE
// ================================================================
async function updateMaintenance(req, res) {
    try {
        const user = req.user;
        if (!canWrite(user)) {
            return res.status(403).json({ error: 'Procurement pekee.' });
        }
        
        const { id, maintId } = req.params;
        
        const allowed = ['type', 'description', 'cost', 'performed_by', 'scheduled_date',
                        'completed_date', 'status', 'next_due_date', 'notes', 'attachments'];
        const sets = [];
        const params = [];
        let idx = 1;
        
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                sets.push(`${key} = $${idx++}`);
                if (key === 'attachments') {
                    params.push(JSON.stringify(req.body[key] || []));
                } else {
                    params.push(req.body[key]);
                }
            }
        }
        
        if (sets.length === 0) {
            return res.status(400).json({ error: 'Hakuna cha ku-update.' });
        }
        
        params.push(maintId, id);
        const sql = `UPDATE asset_maintenance SET ${sets.join(', ')} 
                     WHERE id = $${idx++} AND asset_id = $${idx} RETURNING *`;
        
        const result = await query(sql, params);
        if (result.length === 0) {
            return res.status(404).json({ error: 'Maintenance record haipo.' });
        }
        
        res.json(result[0]);
    } catch (err) {
        console.error('updateMaintenance error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 12. CALCULATE DEPRECIATION (for one asset, for a given year)
// ================================================================
async function calculateDepreciation(req, res) {
    try {
        const user = req.user;
        if (!canWrite(user)) {
            return res.status(403).json({ error: 'Procurement pekee.' });
        }
        
        const { id } = req.params;
        const year = parseInt(req.body.year || new Date().getFullYear(), 10);
        
        const assets = await query(`SELECT * FROM assets WHERE id = $1`, [id]);
        if (assets.length === 0) return res.status(404).json({ error: 'Asset haipo.' });
        
        const asset = assets[0];
        const purchaseDate = asset.purchase_date ? new Date(asset.purchase_date) : null;
        if (!purchaseDate) {
            return res.status(400).json({ error: 'Asset haina tarehe ya manunuzi (purchase_date).' });
        }
        
        const pv = Number(asset.purchase_value);
        const slv = Number(asset.salvage_value || 0);
        const life = Number(asset.useful_life_years || 5);
        const annualDep = (pv - slv) / life;
        
        // Opening value at start of year
        const purchaseYear = purchaseDate.getFullYear();
        const yearsBeforeYear = Math.max(0, year - purchaseYear);
        let opening = pv - (annualDep * yearsBeforeYear);
        if (opening < slv) opening = slv;
        
        // If year is after end of useful life, no more depreciation
        const yearsUsed = year - purchaseYear;
        let depreciationThisYear = 0;
        if (yearsUsed >= 0 && yearsUsed < life && opening > slv) {
            depreciationThisYear = Math.min(annualDep, opening - slv);
        }
        
        let closing = opening - depreciationThisYear;
        if (closing < slv) closing = slv;
        
        // Upsert log
        const existing = await query(
            `SELECT id FROM asset_depreciation_logs WHERE asset_id = $1 AND year = $2`,
            [id, year]
        );
        
        let log;
        if (existing.length > 0) {
            const upd = await query(
                `UPDATE asset_depreciation_logs 
                 SET opening_value = $1, depreciation = $2, closing_value = $3,
                     calculated_at = NOW(), calculated_by = $4
                 WHERE asset_id = $5 AND year = $6
                 RETURNING *`,
                [opening, depreciationThisYear, closing, user.fullName, id, year]
            );
            log = upd[0];
        } else {
            const ins = await query(
                `INSERT INTO asset_depreciation_logs 
                 (asset_id, year, opening_value, depreciation, closing_value, method, calculated_by)
                 VALUES ($1, $2, $3, $4, $5, 'straight-line', $6)
                 RETURNING *`,
                [id, year, opening, depreciationThisYear, closing, user.fullName]
            );
            log = ins[0];
        }
        
        // Update asset current_value
        await query(
            `UPDATE assets SET current_value = $1 WHERE id = $2`,
            [closing, id]
        );
        
        res.json({ success: true, log });
    } catch (err) {
        console.error('calculateDepreciation error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 13. RUN ANNUAL DEPRECIATION (batch — all active assets)
// ================================================================
async function runAnnualDepreciation(req, res) {
    try {
        const user = req.user;
        if (!canWrite(user)) {
            return res.status(403).json({ error: 'Procurement pekee.' });
        }
        
        const year = parseInt(req.body.year || (new Date().getFullYear() - 1), 10);
        
        const assets = await query(
            `SELECT * FROM assets 
             WHERE status = 'Active' 
               AND purchase_date IS NOT NULL`
        );
        
        let processed = 0;
        let skipped = 0;
        const details = [];
        
        for (const asset of assets) {
            try {
                const purchaseDate = new Date(asset.purchase_date);
                const purchaseYear = purchaseDate.getFullYear();
                
                if (year < purchaseYear) {
                    skipped++;
                    continue;
                }
                
                const pv = Number(asset.purchase_value);
                const slv = Number(asset.salvage_value || 0);
                const life = Number(asset.useful_life_years || 5);
                const annualDep = (pv - slv) / life;
                
                const yearsBeforeYear = Math.max(0, year - purchaseYear);
                let opening = pv - (annualDep * yearsBeforeYear);
                if (opening < slv) opening = slv;
                
                const yearsUsed = year - purchaseYear;
                let depThisYear = 0;
                if (yearsUsed >= 0 && yearsUsed < life && opening > slv) {
                    depThisYear = Math.min(annualDep, opening - slv);
                }
                
                let closing = opening - depThisYear;
                if (closing < slv) closing = slv;
                
                // Upsert
                const existing = await query(
                    `SELECT id FROM asset_depreciation_logs WHERE asset_id = $1 AND year = $2`,
                    [asset.id, year]
                );
                
                if (existing.length === 0) {
                    await query(
                        `INSERT INTO asset_depreciation_logs 
                         (asset_id, year, opening_value, depreciation, closing_value, method, calculated_by)
                         VALUES ($1, $2, $3, $4, $5, 'straight-line', $6)`,
                        [asset.id, year, opening, depThisYear, closing, user.fullName]
                    );
                } else {
                    await query(
                        `UPDATE asset_depreciation_logs 
                         SET opening_value = $1, depreciation = $2, closing_value = $3,
                             calculated_at = NOW(), calculated_by = $4
                         WHERE asset_id = $5 AND year = $6`,
                        [opening, depThisYear, closing, user.fullName, asset.id, year]
                    );
                }
                
                await query(
                    `UPDATE assets SET current_value = $1 WHERE id = $2`,
                    [closing, asset.id]
                );
                
                processed++;
                details.push({ id: asset.id, tag: asset.asset_tag, closing });
            } catch (e) {
                console.error(`Depreciation failed for asset ${asset.id}:`, e.message);
            }
        }
        
        res.json({
            success: true,
            year,
            processed,
            skipped,
            details
        });
    } catch (err) {
        console.error('runAnnualDepreciation error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// 14. GET DEPRECIATION HISTORY (ya asset moja)
// ================================================================
async function getDepreciationHistory(req, res) {
    try {
        const { id } = req.params;
        const rows = await query(
            `SELECT * FROM asset_depreciation_logs 
             WHERE asset_id = $1 
             ORDER BY year DESC`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// 🆕 MAINTENANCE REPORTS
// ================================================================

// 1. Ripoti ya Jumla (Overall)
async function getMaintenanceSummary(req, res) {
    try {
        // Gharama zote kwa mwaka huu
        const totalCost = await query(`
            SELECT COALESCE(SUM(cost), 0) as total 
            FROM asset_maintenance 
            WHERE status = 'completed'
        `);

        // Assets zilizotumia pesa nyingi kwenye matengenezo
        const topAssets = await query(`
            SELECT a.id, a.name, a.asset_tag, COALESCE(SUM(m.cost), 0) as total_cost, COUNT(m.id) as repair_count
            FROM assets a
            JOIN asset_maintenance m ON a.id = m.asset_id
            WHERE m.status = 'completed'
            GROUP BY a.id, a.name, a.asset_tag
            ORDER BY total_cost DESC
            LIMIT 5
        `);

        // Gharama kwa aina ya matengenezo
        const byType = await query(`
            SELECT type, COALESCE(SUM(cost), 0) as total_cost, COUNT(*) as count
            FROM asset_maintenance
            WHERE status = 'completed'
            GROUP BY type
        `);

        res.json({
            totalCost: Number(totalCost[0].total),
            topAssets,
            byType
        });
    } catch (err) {
        console.error('getMaintenanceSummary error:', err);
        res.status(500).json({ error: err.message });
    }
}

// 2. Historia ya Asset Moja (Per-Asset)
async function getAssetMaintenanceHistory(req, res) {
    try {
        const { id } = req.params; // Asset ID

        const history = await query(`
            SELECT * FROM asset_maintenance 
            WHERE asset_id = $1 
            ORDER BY created_at DESC
        `, [id]);

        const total = await query(`
            SELECT COALESCE(SUM(cost), 0) as total_cost, COUNT(*) as total_repairs
            FROM asset_maintenance 
            WHERE asset_id = $1 AND status = 'completed'
        `, [id]);

        res.json({
            history,
            summary: {
                totalCost: Number(total[0].total_cost),
                totalRepairs: Number(total[0].total_repairs)
            }
        });
    } catch (err) {
        console.error('getAssetMaintenanceHistory error:', err);
        res.status(500).json({ error: err.message });
    }
}
// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    listAssets,
    getAssetById,
    createAsset,
    updateAsset,
    retireAsset,
    deleteAsset,
    getAssetStats,
    getCategories,
    listMaintenance,
    listAllMaintenance,
    createMaintenance,
    updateMaintenance,
    calculateDepreciation,
    runAnnualDepreciation,
    getMaintenanceSummary,
    getAssetMaintenanceHistory,
    getDepreciationHistory
};