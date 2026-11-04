// ================================================================
// UNIVERSAL PROCUREMENT REQUESTS (Finance, Lawyer, Sales, n.k.)
// ================================================================
let currentDeptUser = null;
let reqDeptRequestItemCounter = 0;
let pendingDeptRequestData = null;

function initDepartmentRequests() {
    currentDeptUser = Auth.getUser();
    if (!currentDeptUser) return;
}

function openDeptRequestModal() {
    initDepartmentRequests();
    
    document.getElementById('deptRequestTitle').value = '';
    document.getElementById('deptRequestJustification').value = '';
    document.getElementById('deptRequestUrgency').value = 'normal';
    document.getElementById('deptRequestRequiredBy').value = '';
    document.getElementById('deptRequestItemsBody').innerHTML = '';
    document.getElementById('deptRequestStatus').className = 'status-msg';
    
    deptRequestItemCounter = 0;
    addDeptRequestItemRow();
    
    document.getElementById('deptRequestModal').classList.add('show');
}

function closeDeptRequestModal() {
    document.getElementById('deptRequestModal').classList.remove('show');
}

function addDeptRequestItemRow() {
    const tbody = document.getElementById('deptRequestItemsBody');
    const rowId = 'dept-item-' + deptRequestItemCounter++;
    
    const row = document.createElement('tr');
    row.id = rowId;
    row.style.borderBottom = '1px solid #e2e8f0';
    row.innerHTML = `
        <td style="padding:6px;"><input type="text" class="dept-item-name" placeholder="Item name" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;"></td>
        <td style="padding:6px;"><input type="text" class="dept-item-spec" placeholder="Spec" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;"></td>
        <td style="padding:6px;"><input type="number" class="dept-item-qty" placeholder="0" min="1" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;" oninput="calculateDeptTotal()"></td>
        <td style="padding:6px;">
            <select class="dept-item-unit" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;">
                <option value="pcs">Pcs</option>
                <option value="bags">Bags</option>
                <option value="blocks">Blocks</option>
                <option value="tons">Tons</option>
                <option value="kg">Kg</option>
                <option value="litres">Litres</option>
                <option value="boxes">Boxes</option>
                <option value="sheets">Sheets</option>
            </select>
        </td>
        <td style="padding:6px;"><input type="number" class="dept-item-price" placeholder="0" min="0" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;" oninput="calculateDeptTotal()"></td>
        <td style="padding:6px;text-align:center;">
            <button type="button" onclick="document.getElementById('${rowId}').remove(); calculateDeptTotal();" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:700;">✕</button>
        </td>
    `;
    tbody.appendChild(row);
}

function calculateDeptTotal() {
    let total = 0;
    document.querySelectorAll('#deptRequestItemsBody tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.dept-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.dept-item-price')?.value) || 0;
        total += qty * price;
    });
    const totalEl = document.getElementById('deptRequestTotalDisplay');
    if (totalEl) totalEl.textContent = 'TSh ' + total.toLocaleString();
}

function submitDeptRequest() {
    const statusDiv = document.getElementById('deptRequestStatus');
    const showStatus = (msg) => {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = msg;
    };
    
    const title = document.getElementById('deptRequestTitle').value.trim();
    const justification = document.getElementById('deptRequestJustification').value.trim();
    
    if (!title) return showStatus('⚠ Tafadhali weka kichwa cha ombi');
    if (!justification) return showStatus('⚠ Tafadhali weka sababu (Justification)');
    
    const items = [];
    document.querySelectorAll('#deptRequestItemsBody tr').forEach(row => {
        const name = row.querySelector('.dept-item-name')?.value.trim();
        const spec = row.querySelector('.dept-item-spec')?.value.trim();
        const qty = parseFloat(row.querySelector('.dept-item-qty')?.value) || 0;
        const unit = row.querySelector('.dept-item-unit')?.value || 'pcs';
        const price = parseFloat(row.querySelector('.dept-item-price')?.value) || 0;
        
        if (name && qty > 0) {
            items.push({ itemName: name, specification: spec, quantity: qty, unit, estimatedPrice: price });
        }
    });
    
    if (items.length === 0) return showStatus('⚠ Ongeza angalau kitu kimoja');
    
    pendingDeptRequestData = {
        department: currentDeptUser.department || 'Unknown',
        items: items,
        notes: justification,
        title: title,
        urgency: document.getElementById('deptRequestUrgency').value,
        requiredBy: document.getElementById('deptRequestRequiredBy').value || null
    };
    
    showDeptRequestPreview(pendingDeptRequestData);
    closeDeptRequestModal();
}

function showDeptRequestPreview(data) {
    document.getElementById('previewDeptName').textContent = data.department;
    document.getElementById('previewDeptTitle').textContent = data.title;
    document.getElementById('previewDeptJustification').textContent = data.notes;
    document.getElementById('previewDeptUrgency').textContent = 
        data.urgency === 'urgent' ? '🔴 Urgent' : data.urgency === 'high' ? '🟡 High' : '🟢 Normal';
    document.getElementById('previewDeptRequiredBy').textContent = data.requiredBy || '—';
    
    const body = document.getElementById('previewDeptItemsBody');
    let total = 0;
    body.innerHTML = data.items.map(item => {
        const sub = (item.estimatedPrice || 0) * item.quantity;
        total += sub;
        return `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:600;">${item.itemName}</td>
                <td style="padding:8px;color:#64748b;font-size:11px;">${item.specification || '—'}</td>
                <td style="padding:8px;">${item.quantity} ${item.unit}</td>
                <td style="padding:8px;text-align:right;font-weight:700;color:#022908;">TSh ${sub.toLocaleString()}</td>
            </tr>
        `;
    }).join('');
    document.getElementById('previewDeptTotal').textContent = 'TSh ' + total.toLocaleString();
    
    const btn = document.getElementById('previewDeptConfirmBtn');
    btn.disabled = false;
    btn.textContent = '✅ Confirm & Send to Procurement';
    
    document.getElementById('previewDeptRequestModal').classList.add('show');
}

function closeDeptRequestPreview() {
    document.getElementById('previewDeptRequestModal').classList.remove('show');
}

async function confirmDeptRequestSubmit() {
    if (!pendingDeptRequestData) return;
    
    const btn = document.getElementById('previewDeptConfirmBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Sending... Please wait';
    
    try {
        await API.createProcurementRequest(pendingDeptRequestData);
        
        btn.textContent = '✅ Sent Successfully!';
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        
        showToast('✅ Request sent to Procurement!', 'success');
        
        setTimeout(() => {
            closeDeptRequestPreview();
            pendingDeptRequestData = null;
            loadMyRequests();
        }, 1500);
        
    } catch (err) {
        btn.disabled = false;
        btn.textContent = '✅ Confirm & Send to Procurement';
        showToast('❌ Failed: ' + err.message, 'error');
    }
}

async function loadMyRequests() {
    const tbody = document.getElementById('myRequestsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">⏳ Loading...</td></tr>`;
    
    try {
        const all = await API.getProcurementRequests('/all');
        const user = currentDeptUser || Auth.getUser();
        
        // 🆕 ULINZI: Hakikisha data ni array
        const list = Array.isArray(all) ? all : (all?.requests || all?.data || []);
        const myRequests = list.filter(r => r.requested_by === user.fullName);
        
        if (myRequests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">📭 Hujatuma ombi lolote bado.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = myRequests.map(r => {
            const statusInfo = getDeptStatusInfo(r.status);
            return `
                <tr>
                    <td><strong style="font-family:monospace;color:#022908;">${r.request_number}</strong></td>
                    <td>${r.title || '—'}</td>
                    <td>TSh ${Number(r.total_amount || 0).toLocaleString()}</td>
                    <td>
                        <span style="display:inline-flex;align-items:center;gap:4px;background:${statusInfo.bg};color:${statusInfo.color};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:800;text-transform:uppercase;">
                            ${statusInfo.icon} ${statusInfo.label}
                        </span>
                    </td>
                    <td>${new Date(r.created_at).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}</td>
                    <td>
                        <button onclick="viewDeptRequest(${r.id})" style="padding:4px 10px;background:var(--blue);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">👁 View</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('❌ loadMyRequests error:', err);
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align:center;padding:30px;color:var(--red);">
                ❌ Kosa: ${err.message}<br>
                <small style="color:#94a3b8;">Angalia Console (F12) kwa maelezo zaidi</small>
            </td></tr>
        `;
    }
}

function getDeptStatusInfo(status) {
    const map = {
        'pending':         { icon: '⏳', label: 'Awaiting Procurement', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'pending-manager': { icon: '👔', label: 'With Manager', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
        'pending-ceo':     { icon: '🏢', label: 'With CEO', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
        'approved':        { icon: '✅', label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
        'purchasing':      { icon: '🛒', label: 'In Purchasing', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'pending-finance': { icon: '💰', label: 'With Finance', color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
        'paid':            { icon: '💵', label: 'Paid', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
        'completed':       { icon: '🎉', label: 'Completed', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
        'returned':        { icon: '🔄', label: 'Returned', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'rejected':        { icon: '❌', label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
    };
    return map[status] || { icon: '❓', label: status, color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
}

async function viewDeptRequest(id) {
    try {
        const request = await API.getProcurementRequestById(id);
        const statusInfo = getDeptStatusInfo(request.status);
        
        let itemsHtml = (request.items || []).map(item => `
            <div style="background:white;padding:12px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;border:1px solid #e2e8f0;">
                <div>
                    <div style="font-weight:700;">${item.item_name}</div>
                    <div style="font-size:11px;color:#64748b;">${item.quantity} ${item.unit} × TSh ${Number(item.estimated_price || 0).toLocaleString()}</div>
                </div>
                <div style="font-weight:700;color:var(--primary);">TSh ${Number((item.estimated_price || 0) * item.quantity).toLocaleString()}</div>
            </div>
        `).join('');
        
        let modalHTML = `
            <div class="modern-modal-overlay show" id="viewRequestModal" style="z-index: 50000;">
                <div class="modern-modal" style="max-width: 600px;">
                    <div class="modern-modal-header">
                        <div class="modern-modal-header-left">
                            <div class="modern-modal-icon">📋</div>
                            <div>
                                <h3>Request Details</h3>
                                <p>${request.request_number}</p>
                            </div>
                        </div>
                        <button class="modern-modal-close" onclick="document.getElementById('viewRequestModal').remove()">✕</button>
                    </div>
                    <div class="modern-modal-body" style="background:#f8fafc;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:16px;padding:12px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                            <div>
                                <div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;">Department</div>
                                <div style="font-weight:700;">${request.department || '—'}</div>
                            </div>
                            <div>
                                <div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;">Status</div>
                                <div style="color:${statusInfo.color};font-weight:700;">${statusInfo.icon} ${statusInfo.label}</div>
                            </div>
                        </div>
                        <div style="margin-bottom:16px;">
                            <div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:8px;">📝 JUSTIFICATION</div>
                            <div style="font-size:13px;color:#475569;background:white;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">${request.notes || '—'}</div>
                        </div>
                        <div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:8px;">🛒 ITEMS</div>
                        ${itemsHtml}
                        <div style="background:var(--primary-dark);color:white;padding:16px;border-radius:8px;margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:700;">TOTAL:</span>
                            <span style="font-size:20px;font-weight:800;color:var(--gold);">TSh ${Number(request.total_amount || 0).toLocaleString()}</span>
                        </div>
                        ${request.rejection_reason ? `
                            <div style="background:rgba(239,68,68,0.05);border-left:4px solid #ef4444;padding:14px;border-radius:8px;margin-top:16px;">
                                <div style="font-size:11px;font-weight:800;color:#b91c1c;text-transform:uppercase;margin-bottom:4px;">❌ Reason</div>
                                <div style="font-size:13px;color:#7f1d1d;">${request.rejection_reason}</div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modern-modal-footer">
                        <button class="modern-btn-cancel" onclick="document.getElementById('viewRequestModal').remove()">Close</button>
                        ${request.status === 'rejected' ? `
                            <button class="modern-btn-primary" onclick="document.getElementById('viewRequestModal').remove(); openEditRequestModal(${request.id})" style="background:linear-gradient(135deg, #f59e0b, #d97706);">
                                🖊️ Edit & Resubmit
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (err) {
        showToast('Failed to load request: ' + err.message, 'error');
    }
}

async function openEditRequestModal(id) {
    try {
        const request = await API.getProcurementRequestById(id);
        
        if (typeof openDeptRequestModal === 'function') {
            openDeptRequestModal();
            
            document.getElementById('deptRequestTitle').value = request.title || '';
            document.getElementById('deptRequestJustification').value = request.rejection_reason ? `(Ilikataliwa: ${request.rejection_reason}) ` : '';
            document.getElementById('deptRequestUrgency').value = request.urgency || 'normal';
            document.getElementById('deptRequestRequiredBy').value = request.required_by || '';
            
            document.getElementById('deptRequestItemsBody').innerHTML = '';
            deptRequestItemCounter = 0;
            
            if (request.items && request.items.length > 0) {
                request.items.forEach(item => {
                    addDeptRequestItemRow();
                    const rows = document.querySelectorAll('#deptRequestItemsBody tr');
                    const lastRow = rows[rows.length - 1];
                    
                    lastRow.querySelector('.dept-item-name').value = item.item_name || '';
                    lastRow.querySelector('.dept-item-spec').value = item.specification || '';
                    lastRow.querySelector('.dept-item-qty').value = item.quantity || 1;
                    lastRow.querySelector('.dept-item-unit').value = item.unit || 'pcs';
                    lastRow.querySelector('.dept-item-price').value = item.estimated_price || 0;
                });
                calculateDeptTotal();
            } else {
                addDeptRequestItemRow();
            }
        }
    } catch (err) {
        showToast('Failed to load request for editing: ' + err.message, 'error');
    }
}