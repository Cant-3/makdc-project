// ================================================================
// MAK DC INVESTMENT — MARKET RESEARCH DASHBOARD
// ================================================================

let allResearch = [];
let currentResearchFilter = 'all';
let currentEditingResearchId = null;
let currentFindings = [];   // Array ya findings kwa form

// ================================================================
// LOAD RESEARCH
// ================================================================
async function loadMarketResearch() {
    const loading = document.getElementById('researchLoading');
    const empty = document.getElementById('researchEmpty');
    const grid = document.getElementById('researchGrid');

    if (loading) loading.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (grid) grid.style.display = 'none';

    try {
        const response = await API.getMarketResearch();
        allResearch = response.research || [];

        updateResearchCounts();
        renderResearch();

    } catch (err) {
        console.error('❌ Research error:', err);
        if (loading) {
            loading.innerHTML = `
                <div style="color:#dc2626;font-size:14px;font-weight:700;">
                    ❌ Failed to load research
                </div>
                <div style="font-size:12px;color:#94a3b8;margin-top:6px;">${err.message}</div>
            `;
        }
    }
}

// ================================================================
// UPDATE COUNTS
// ================================================================
function updateResearchCounts() {
    const counts = {
        all: allResearch.length,
        competitor: allResearch.filter(r => r.researchType === 'competitor').length,
        survey: allResearch.filter(r => r.researchType === 'survey').length,
        trend: allResearch.filter(r => r.researchType === 'trend').length,
        pricing: allResearch.filter(r => r.researchType === 'pricing').length
    };

    setText('countAllResearch', counts.all);
    setText('countCompetitor', counts.competitor);
    setText('countSurvey', counts.survey);
    setText('countTrend', counts.trend);
    setText('countPricing', counts.pricing);
}

// ================================================================
// FILTER
// ================================================================
function filterResearch(filter, btnEl) {
    currentResearchFilter = filter;
    document.querySelectorAll('.marketing-filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderResearch();
}

// ================================================================
// RENDER
// ================================================================
function renderResearch() {
    const loading = document.getElementById('researchLoading');
    const empty = document.getElementById('researchEmpty');
    const grid = document.getElementById('researchGrid');

    if (loading) loading.style.display = 'none';

    let research = allResearch;
    if (currentResearchFilter !== 'all') {
        research = research.filter(r => r.researchType === currentResearchFilter);
    }

    if (research.length === 0) {
        if (empty) empty.style.display = 'block';
        if (grid) grid.style.display = 'none';
        return;
    }

    if (empty) empty.style.display = 'none';
    if (grid) {
        grid.style.display = 'grid';
        grid.innerHTML = research.map(r => renderResearchCard(r)).join('');
    }
}

// ================================================================
// RENDER CARD
// ================================================================
function renderResearchCard(r) {
    const typeIcons = {
        competitor: '🏢',
        survey: '👥',
        trend: '📊',
        pricing: '💰'
    };

    const startDate = r.periodStart 
        ? new Date(r.periodStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
    const endDate = r.periodEnd 
        ? new Date(r.periodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const findingsCount = (r.findings || []).length;

    return `
        <div class="research-card">
            <div class="marketing-card-header">
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <span style="font-size:18px;">${typeIcons[r.researchType] || '📊'}</span>
                        <span class="research-type-badge ${r.researchType}">${r.researchType}</span>
                        <span class="research-status-badge ${r.status}">${r.status}</span>
                    </div>
                    <div class="marketing-card-title">${esc(r.title)}</div>
                </div>
            </div>
            <div class="marketing-card-body">
                ${r.description ? `<div class="marketing-card-desc">${esc(r.description)}</div>` : ''}
                
                <div class="marketing-card-info">
                    ${r.conductedBy ? `
                        <div class="marketing-info-row">
                            <span class="icon">👤</span>
                            <span class="label">Conducted By</span>
                            <span class="value">${esc(r.conductedBy)}</span>
                        </div>
                    ` : ''}
                    <div class="marketing-info-row">
                        <span class="icon">📅</span>
                        <span class="label">Period</span>
                        <span class="value" style="font-size:11px;">${startDate} → ${endDate}</span>
                    </div>
                    <div class="marketing-info-row">
                        <span class="icon">🔍</span>
                        <span class="label">Findings</span>
                        <span class="value">${findingsCount}</span>
                    </div>
                </div>
            </div>
            <div class="marketing-card-footer">
                <button class="marketing-card-btn view" onclick="viewResearch(${r.id})">👁 View</button>
                <button class="marketing-card-btn edit" onclick="openResearchModal(${r.id})">🖋️ Edit</button>
                <button class="marketing-card-btn delete" onclick="deleteResearch(${r.id}, '${esc(r.title)}')">🗑</button>
            </div>
        </div>
    `;
}

// ================================================================
// OPEN MODAL (Create/Edit)
// ================================================================
async function openResearchModal(researchId = null) {
    currentEditingResearchId = researchId;
    currentFindings = [];

    const modal = document.getElementById('researchModal');
    if (!modal) createResearchModal();

    // Reset
    resetResearchForm();

    const titleEl = document.getElementById('researchModalTitle');
    if (titleEl) {
        titleEl.textContent = researchId ? '🖋️ Edit Research' : '➕ New Research';
    }

    // Load data if editing
    if (researchId) {
        try {
            const r = await API.getResearch(researchId);
            fillResearchForm(r);
        } catch (err) {
            showToast('Failed to load: ' + err.message, 'error');
            return;
        }
    }

    document.getElementById('researchModal').classList.add('show');
}

// ================================================================
// CREATE MODAL HTML
// ================================================================
function createResearchModal() {
    const modalHTML = `
        <div class="modal-overlay" id="researchModal">
            <div class="modal-box" style="max-width: 720px; padding: 0; overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;">
                <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <h3 id="researchModalTitle" style="font-size:18px;font-weight:800;color:white;margin:0;">➕ New Research</h3>
                    <button onclick="closeModal('researchModal')" style="background:rgba(255,255,255,0.15);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                </div>
                <div style="padding:22px 26px;overflow-y:auto;flex:1;">
                    <div style="margin-bottom:14px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Title <span style="color:#dc2626;">*</span></label>
                        <input type="text" id="rschTitle" placeholder="e.g., Competitor Analysis — Tanzania Cement" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                        <div>
                            <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Type <span style="color:#dc2626;">*</span></label>
                            <select id="rschType" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                                <option value="competitor">🏢 Competitor</option>
                                <option value="survey">👥 Customer Survey</option>
                                <option value="trend">📊 Market Trend</option>
                                <option value="pricing">💰 Pricing</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Status</label>
                            <select id="rschStatus" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                                <option value="draft">📝 Draft</option>
                                <option value="ongoing">🔄 Ongoing</option>
                                <option value="completed">✅ Completed</option>
                                <option value="cancelled">❌ Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom:14px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Description</label>
                        <textarea id="rschDescription" placeholder="Brief description..." style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;min-height:60px;resize:vertical;"></textarea>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                        <div>
                            <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Conducted By</label>
                            <input type="text" id="rschConductedBy" placeholder="e.g., Halima Hamisi" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Period Start</label>
                            <input type="date" id="rschPeriodStart" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                        </div>
                    </div>

                    <div style="margin-bottom:14px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Period End</label>
                        <input type="date" id="rschPeriodEnd" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                    </div>

                    <!-- FINDINGS -->
                    <div style="margin-bottom:14px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;">🔍 Findings</label>
                            <button type="button" onclick="addFindingRow()" style="padding:6px 14px;background:linear-gradient(135deg,#14b8a6,#0f766e);color:white;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;font-family:inherit;">➕ Add Finding</button>
                        </div>
                        <div id="findingsContainer"></div>
                    </div>

                    <!-- SUMMARY -->
                    <div style="margin-bottom:14px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">📝 Summary</label>
                        <textarea id="rschSummary" placeholder="Key insights kutoka research..." style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;min-height:70px;resize:vertical;"></textarea>
                    </div>

                    <!-- RECOMMENDATIONS -->
                    <div style="margin-bottom:14px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">💡 Recommendations</label>
                        <textarea id="rschRecommendations" placeholder="What should be done based on findings..." style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;min-height:70px;resize:vertical;"></textarea>
                    </div>

                    <div id="researchModalStatus" class="status-msg"></div>
                </div>
                <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;">
                    <button onclick="closeModal('researchModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                    <button onclick="saveResearch()" style="padding:11px 24px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">💾 Save Research</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ================================================================
// ADD FINDING ROW
// ================================================================
function addFindingRow(finding = null) {
    const container = document.getElementById('findingsContainer');
    if (!container) return;

    const id = 'finding-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    const row = document.createElement('div');
    row.id = id;
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 2fr auto;gap:8px;margin-bottom:8px;align-items:start;background:var(--gray-50);padding:10px;border-radius:8px;';
    row.innerHTML = `
        <input type="text" class="finding-key" placeholder="Key (e.g., Market Share)" value="${finding?.key || ''}" style="padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:12px;font-family:inherit;background:white;">
        <input type="text" class="finding-value" placeholder="Value (e.g., 25%)" value="${finding?.value || ''}" style="padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:12px;font-family:inherit;background:white;">
        <input type="text" class="finding-insight" placeholder="Insight (optional)" value="${finding?.insight || ''}" style="padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:12px;font-family:inherit;background:white;">
        <button type="button" onclick="removeFindingRow('${id}')" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;font-weight:700;font-size:11px;">✕</button>
    `;
    container.appendChild(row);
}

function removeFindingRow(id) {
    const row = document.getElementById(id);
    if (row) row.remove();
}

// ================================================================
// RESET FORM
// ================================================================
function resetResearchForm() {
    const fields = ['rschTitle', 'rschDescription', 'rschConductedBy', 
                    'rschPeriodStart', 'rschPeriodEnd', 'rschSummary', 'rschRecommendations'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const typeEl = document.getElementById('rschType');
    if (typeEl) typeEl.value = 'competitor';
    const statusEl = document.getElementById('rschStatus');
    if (statusEl) statusEl.value = 'draft';

    const container = document.getElementById('findingsContainer');
    if (container) container.innerHTML = '';

    const statusMsg = document.getElementById('researchModalStatus');
    if (statusMsg) {
        statusMsg.className = 'status-msg';
        statusMsg.textContent = '';
    }
}

// ================================================================
// FILL FORM
// ================================================================
function fillResearchForm(r) {
    setInputValue('rschTitle', r.title);
    setInputValue('rschType', r.researchType);
    setInputValue('rschStatus', r.status);
    setInputValue('rschDescription', r.description);
    setInputValue('rschConductedBy', r.conductedBy);
    setInputValue('rschPeriodStart', r.periodStart?.split('T')[0]);
    setInputValue('rschPeriodEnd', r.periodEnd?.split('T')[0]);
    setInputValue('rschSummary', r.summary);
    setInputValue('rschRecommendations', r.recommendations);

    // Findings
    const container = document.getElementById('findingsContainer');
    if (container) {
        container.innerHTML = '';
        (r.findings || []).forEach(f => addFindingRow(f));
    }
}

// ================================================================
// SAVE RESEARCH
// ================================================================
async function saveResearch() {
    const statusMsg = document.getElementById('researchModalStatus');
    const status = (msg, type = 'error') => {
        statusMsg.className = 'status-msg ' + type;
        statusMsg.textContent = msg;
    };

    const title = document.getElementById('rschTitle')?.value.trim();
    const researchType = document.getElementById('rschType')?.value;

    if (!title) return status('⚠ Title is required');
    if (!researchType) return status('⚠ Type is required');

    // Collect findings
    const findings = [];
    document.querySelectorAll('#findingsContainer > div').forEach(row => {
        const key = row.querySelector('.finding-key')?.value.trim();
        const value = row.querySelector('.finding-value')?.value.trim();
        const insight = row.querySelector('.finding-insight')?.value.trim();
        if (key && value) {
            findings.push({ key, value, insight: insight || null });
        }
    });

    const payload = {
        title,
        researchType,
        status: document.getElementById('rschStatus')?.value || 'draft',
        description: document.getElementById('rschDescription')?.value.trim() || null,
        conductedBy: document.getElementById('rschConductedBy')?.value.trim() || null,
        periodStart: document.getElementById('rschPeriodStart')?.value || null,
        periodEnd: document.getElementById('rschPeriodEnd')?.value || null,
        findings,
        summary: document.getElementById('rschSummary')?.value.trim() || null,
        recommendations: document.getElementById('rschRecommendations')?.value.trim() || null
    };

    try {
        if (currentEditingResearchId) {
            await API.updateResearch(currentEditingResearchId, payload);
            showToast('✅ Research updated!', 'success');
        } else {
            await API.createResearch(payload);
            showToast('✅ Research created!', 'success');
        }

        closeModal('researchModal');
        loadMarketResearch();

    } catch (err) {
        console.error('❌ Save research error:', err);
        status('⚠ ' + err.message, 'error');
    }
}

// ================================================================
// VIEW RESEARCH
// ================================================================
async function viewResearch(id) {
    try {
        const r = await API.getResearch(id);
        showResearchViewModal(r);
    } catch (err) {
        showToast('Failed to load: ' + err.message, 'error');
    }
}

function showResearchViewModal(r) {
    const existing = document.getElementById('researchViewModal');
    if (existing) existing.remove();

    const typeIcons = {
        competitor: '🏢', survey: '👥', trend: '📊', pricing: '💰'
    };

    const startDate = r.periodStart 
        ? new Date(r.periodStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
    const endDate = r.periodEnd 
        ? new Date(r.periodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const findingsHtml = (r.findings || []).map(f => `
        <div class="finding-item">
            <div class="finding-key">${esc(f.key)}</div>
            <div class="finding-value">${esc(f.value)}</div>
            ${f.insight ? `<div class="finding-insight">${esc(f.insight)}</div>` : ''}
        </div>
    `).join('') || '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">No findings recorded</div>';

    const modalHTML = `
        <div class="modal-overlay" id="researchViewModal">
            <div class="modal-box" style="max-width: 680px; padding: 0; overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;">
                <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:24px 28px;color:white;position:relative;flex-shrink:0;">
                    <button onclick="closeModal('researchViewModal')" style="position:absolute;top:18px;right:18px;background:rgba(255,255,255,0.15);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <span style="font-size:24px;">${typeIcons[r.researchType] || '📊'}</span>
                        <span class="research-type-badge ${r.researchType}" style="background:rgba(255,255,255,0.2);color:white;">${r.researchType}</span>
                        <span class="research-status-badge ${r.status}" style="background:rgba(255,255,255,0.2);color:white;">${r.status}</span>
                    </div>
                    <h2 style="font-size:20px;font-weight:800;color:white;margin:0 0 6px 0;padding-right:40px;">${esc(r.title)}</h2>
                    <div style="font-size:12px;color:rgba(255,255,255,0.8);display:flex;gap:14px;flex-wrap:wrap;">
                        ${r.conductedBy ? `<span>👤 ${esc(r.conductedBy)}</span>` : ''}
                        <span>📅 ${startDate} → ${endDate}</span>
                    </div>
                </div>
                <div style="padding:22px 28px;overflow-y:auto;flex:1;">
                    ${r.description ? `
                        <div style="margin-bottom:20px;">
                            <div style="font-size:11px;font-weight:900;color:var(--primary);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">📝 Description</div>
                            <div style="font-size:13.5px;color:#475569;line-height:1.6;">${esc(r.description)}</div>
                        </div>
                    ` : ''}

                    <div style="margin-bottom:20px;">
                        <div style="font-size:11px;font-weight:900;color:var(--primary);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">🔍 Findings (${(r.findings || []).length})</div>
                        ${findingsHtml}
                    </div>

                    ${r.summary ? `
                        <div style="margin-bottom:20px;">
                            <div style="font-size:11px;font-weight:900;color:var(--primary);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">📝 Summary</div>
                            <div style="font-size:13.5px;color:#475569;line-height:1.6;">${esc(r.summary)}</div>
                        </div>
                    ` : ''}

                    ${r.recommendations ? `
                        <div style="margin-bottom:20px;">
                            <div style="font-size:11px;font-weight:900;color:var(--primary);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">💡 Recommendations</div>
                            <div style="background:rgba(139,92,246,0.06);padding:14px 16px;border-radius:10px;border-left:4px solid #8b5cf6;font-size:13.5px;color:#475569;line-height:1.6;">${esc(r.recommendations)}</div>
                        </div>
                    ` : ''}

                    <div style="margin-bottom:0;">
                        <div style="font-size:11px;font-weight:900;color:var(--primary);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">ℹ️ Meta</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            <div style="background:var(--gray-50);padding:10px 14px;border-radius:8px;border-left:3px solid var(--gold);">
                                <div style="font-size:9.5px;font-weight:800;color:var(--gray-500);text-transform:uppercase;">Created By</div>
                                <div style="font-size:13px;font-weight:700;color:var(--gray-800);">${esc(r.creator?.fullName || '—')}</div>
                            </div>
                            <div style="background:var(--gray-50);padding:10px 14px;border-radius:8px;border-left:3px solid var(--gold);">
                                <div style="font-size:9.5px;font-weight:800;color:var(--gray-500);text-transform:uppercase;">Created At</div>
                                <div style="font-size:13px;font-weight:700;color:var(--gray-800);">${new Date(r.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('researchViewModal').classList.add('show');
}

// ================================================================
// DELETE RESEARCH
// ================================================================
async function deleteResearch(id, title) {
    if (!confirm(`Delete research "${title}"?\n\nThis action cannot be undone.`)) return;

    try {
        await API.deleteResearch(id);
        showToast('✅ Research deleted', 'success');
        loadMarketResearch();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}

// ================================================================
// HELPERS
// ================================================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}