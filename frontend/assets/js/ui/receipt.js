// ===================================  
// MAK DC INVESTMENT — RECEIPT UTILITY 
// ===================================
const RECEIPT_COLORS = {
    junglePrimary: '#0f766e',
    jungleDark: '#134e4a',
    jungleLight: '#14b8a6',
    jungleSoft: '#ecfdf5',
    jungleVerySoft: '#f0fdfa',
    gold: '#f59e0b',
    goldLight: '#fbbf24',
    goldDark: '#d97706',
    textDark: '#0f172a',
    textMid: '#334155',
    textLight: '#64748b',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    bgLight: '#f8fafc'
};
function showReceiptModal(order) {
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');

    if (!modal || !content) {
        console.warn('Receipt modal not found in DOM');
        alert('Receipt: ' + (order.receiptNumber || '—'));
        return;
    }

    content.innerHTML = buildReceiptHTML(order);

    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    window.__currentReceipt = order;
}
function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (!modal) return;

    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.style.overflow = '';
    window.__currentReceipt = null;
}
function buildReceiptHTML(order) {
    const C = RECEIPT_COLORS;
    const items = order.items || [];
    const totalItems = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

    const itemsHtml = items.map((item, idx) => `
        <tr style="border-bottom:1px solid ${C.border};${idx % 2 === 1 ? `background:${C.bgLight};` : ''}">
            <td style="padding:12px 16px;color:${C.textDark};font-size:12px;font-weight:600;">${escReceipt(item.productName)}</td>
            <td style="padding:12px 16px;color:${C.textMid};font-size:12px;text-align:center;font-weight:600;">${item.quantity}</td>
            <td style="padding:12px 16px;color:${C.textMid};font-size:12px;text-align:right;">TSh ${Number(item.unitPrice || 0).toLocaleString()}</td>
            <td style="padding:12px 16px;color:${C.jungleDark};font-size:13px;font-weight:800;text-align:right;">TSh ${Number(item.subtotal || 0).toLocaleString()}</td>
        </tr>
    `).join('');

    const paymentMethod = order.paymentType === 'postpaid'
        ? '📋 Payment After Delivery'
        : (order.paymentAccount ? `💳 ${escReceipt(order.paymentAccount.name)}` : '💳 Prepaid');

    const issueDate = order.receiptIssuedAt
        ? new Date(order.receiptIssuedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
        <div style="padding:0;background:white;font-family:'Inter',Arial,sans-serif;max-width:800px;margin:0 auto;">

            <!-- TOP ACCENT BAR -->
            <div style="height:8px;background:linear-gradient(90deg,${C.jungleDark} 0%,${C.junglePrimary} 40%,${C.jungleLight} 70%,${C.gold} 100%);"></div>

            <!-- HEADER -->
            <div style="padding:32px 44px 24px;background:linear-gradient(135deg,#ffffff 0%,${C.jungleVerySoft} 100%);">

                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;">

                    <div style="display:flex;gap:16px;align-items:center;">
                        <div style="position:relative;">
                            <div style="width:78px;height:78px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(15,118,110,0.25);border:3px solid white;outline:3px solid ${C.gold};overflow:hidden;">
                                <img src="assets/makdc-logo.jpg" alt="MAK DC" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.outerHTML='<span style=\'font-size:26px;font-weight:900;color:#0f766e;letter-spacing:1px;\'>MAK</span>'">
                            </div>
                            <div style="position:absolute;bottom:-2px;right:-2px;width:24px;height:24px;border-radius:50%;background:${C.gold};display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;">✓</div>
                        </div>
                        <div>
                            <div style="font-size:21px;font-weight:900;color:${C.junglePrimary};line-height:1.1;letter-spacing:-0.5px;">
                                MAK DC Investment
                            </div>
                            <div style="font-size:13px;font-weight:800;color:${C.jungleDark};letter-spacing:2px;margin-top:2px;">
                                COMPANY LIMITED
                            </div>
                            <div style="font-size:11px;color:${C.textLight};font-style:italic;margin-top:6px;">
                                "Quality service is our priority."
                            </div>
                            <div style="font-size:10px;color:${C.textMuted};margin-top:4px;line-height:1.5;">
                                Makete District Council SPV • Tanzania<br>
                                info@makdc.co.tz • +255 754 123 456
                            </div>
                        </div>
                    </div>

                    <div style="text-align:right;min-width:200px;">
                        <div style="display:inline-block;padding:6px 16px;border-radius:20px;background:${C.jungleDark};color:white;font-size:10px;font-weight:900;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;">
                            Payment Receipt
                        </div>
                        <div style="font-size:11px;color:${C.textLight};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
                            Receipt Number
                        </div>
                        <div style="font-family:'Courier New',monospace;font-size:18px;font-weight:900;color:${C.goldDark};letter-spacing:1px;">
                            ${escReceipt(order.receiptNumber || '—')}
                        </div>
                        <div style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:6px 16px;border-radius:20px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;background:${C.jungleSoft};color:${C.jungleDark};border:2px solid ${C.junglePrimary};">
                            <span style="width:8px;height:8px;border-radius:50%;background:${C.junglePrimary};box-shadow:0 0 8px ${C.junglePrimary};"></span>
                            PAID IN FULL
                        </div>
                    </div>

                </div>

            </div>

            <!-- DIVIDER -->
            <div style="height:2px;background:linear-gradient(90deg,transparent 0%,${C.junglePrimary} 20%,${C.gold} 50%,${C.junglePrimary} 80%,transparent 100%);"></div>

            <!-- INFO GRID -->
            <div style="padding:24px 44px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

                    <div style="background:linear-gradient(135deg,#ffffff 0%,${C.jungleVerySoft} 100%);border-radius:12px;padding:18px 20px;border:1.5px solid ${C.border};border-left:4px solid ${C.junglePrimary};box-shadow:0 2px 8px rgba(15,118,110,0.06);">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                            <div style="width:28px;height:28px;border-radius:8px;background:${C.junglePrimary};color:white;display:flex;align-items:center;justify-content:center;font-size:14px;">👤</div>
                            <div style="font-size:11px;font-weight:900;color:${C.junglePrimary};text-transform:uppercase;letter-spacing:1.5px;">
                                Customer Details
                            </div>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:${C.textMid};border-bottom:1px dashed ${C.border};">
                            <span style="font-weight:600;">Name:</span>
                            <strong style="color:${C.textDark};text-align:right;max-width:60%;word-break:break-word;">${escReceipt(order.customerName || '—')}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:${C.textMid};border-bottom:1px dashed ${C.border};">
                            <span style="font-weight:600;">Phone:</span>
                            <strong style="color:${C.textDark};font-family:monospace;">${escReceipt(order.phone || '—')}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:${C.textMid};border-bottom:1px dashed ${C.border};">
                            <span style="font-weight:600;">Email:</span>
                            <strong style="color:${C.textDark};font-size:11px;text-align:right;max-width:60%;word-break:break-all;">${escReceipt(order.email || '—')}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:${C.textMid};">
                            <span style="font-weight:600;">Location:</span>
                            <strong style="color:${C.textDark};text-align:right;">${escReceipt(order.district || '—')}, ${escReceipt(order.region || '—')}</strong>
                        </div>
                    </div>

                    <div style="background:linear-gradient(135deg,#ffffff 0%,#fffbeb 100%);border-radius:12px;padding:18px 20px;border:1.5px solid ${C.border};border-left:4px solid ${C.gold};box-shadow:0 2px 8px rgba(245,158,11,0.06);">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                            <div style="width:28px;height:28px;border-radius:8px;background:${C.gold};color:white;display:flex;align-items:center;justify-content:center;font-size:14px;">📦</div>
                            <div style="font-size:11px;font-weight:900;color:${C.goldDark};text-transform:uppercase;letter-spacing:1.5px;">
                                Order Information
                            </div>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:${C.textMid};border-bottom:1px dashed ${C.border};">
                            <span style="font-weight:600;">Order ID:</span>
                            <strong style="color:${C.textDark};font-family:monospace;">${escReceipt(order.orderId || '—')}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:${C.textMid};border-bottom:1px dashed ${C.border};">
                            <span style="font-weight:600;">Issue Date:</span>
                            <strong style="color:${C.textDark};font-size:11px;">${issueDate}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:${C.textMid};border-bottom:1px dashed ${C.border};">
                            <span style="font-weight:600;">Payment:</span>
                            <strong style="color:${C.textDark};font-size:11px;text-align:right;">${paymentMethod}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:${C.textMid};">
                            <span style="font-weight:600;">Total Items:</span>
                            <strong style="color:${C.textDark};">${items.length} (${totalItems} units)</strong>
                        </div>
                    </div>

                </div>
            </div>

            <!-- ITEMS TABLE -->
            <div style="padding:0 44px 24px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <div style="font-size:13px;font-weight:900;color:${C.jungleDark};text-transform:uppercase;letter-spacing:2px;">
                        🛒 Items Purchased
                    </div>
                    <div style="flex:1;height:2px;background:linear-gradient(90deg,${C.junglePrimary},transparent);"></div>
                </div>

                <div style="border:1.5px solid ${C.border};border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15,118,110,0.06);">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:linear-gradient(135deg,${C.jungleDark} 0%,${C.junglePrimary} 100%);">
                                <th style="padding:14px 16px;text-align:left;font-size:10px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:1.5px;">Product</th>
                                <th style="padding:14px 16px;text-align:center;font-size:10px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:1.5px;width:80px;">Qty</th>
                                <th style="padding:14px 16px;text-align:right;font-size:10px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:1.5px;width:140px;">Unit Price</th>
                                <th style="padding:14px 16px;text-align:right;font-size:10px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:1.5px;width:160px;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml || '<tr><td colspan="4" style="padding:30px;text-align:center;color:' + C.textMuted + ';font-style:italic;">No items</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr style="background:${C.jungleSoft};border-top:2px solid ${C.junglePrimary};">
                                <td colspan="3" style="padding:16px;text-align:right;font-weight:900;color:${C.jungleDark};font-size:13px;text-transform:uppercase;letter-spacing:1px;">
                                    Grand Total:
                                </td>
                                <td style="padding:16px;text-align:right;font-weight:900;color:${C.junglePrimary};font-size:18px;">
                                    TSh ${Number(order.totalAmount || 0).toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- TOTAL BOX -->
            <div style="padding:0 44px 24px;">
                <div style="background:linear-gradient(135deg,${C.jungleDark} 0%,${C.junglePrimary} 60%,${C.jungleLight} 100%);border-radius:14px;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 10px 30px rgba(15,118,110,0.3);position:relative;overflow:hidden;">
                    <div style="position:absolute;top:-30%;right:-10%;width:200px;height:200px;background:radial-gradient(circle,rgba(245,158,11,0.3),transparent 70%);border-radius:50%;"></div>
                    <div style="position:relative;z-index:1;">
                        <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.85);margin-bottom:4px;">
                            Amount Paid
                        </div>
                        <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.7);">
                            Payment received in full
                        </div>
                    </div>
                    <div style="position:relative;z-index:1;text-align:right;">
                        <div style="font-size:30px;font-weight:900;color:${C.goldLight};letter-spacing:-1px;line-height:1;">
                            TSh ${Number(order.totalAmount || 0).toLocaleString()}
                        </div>
                        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;margin-top:6px;">
                            Paid in Full ✓
                        </div>
                    </div>
                </div>
            </div>

            <!-- VERIFICATION BOX -->
            <div style="padding:0 44px 24px;">
                <div style="background:linear-gradient(135deg,${C.jungleSoft} 0%,${C.jungleVerySoft} 100%);border:1.5px solid ${C.junglePrimary};border-radius:12px;padding:18px 22px;box-shadow:0 2px 10px rgba(15,118,110,0.08);">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                        <div style="width:32px;height:32px;border-radius:50%;background:${C.junglePrimary};color:white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(15,118,110,0.3);">
                            ✓
                        </div>
                        <div>
                            <div style="font-size:12px;font-weight:900;color:${C.jungleDark};text-transform:uppercase;letter-spacing:1.5px;">
                                Payment Verified & Approved
                            </div>
                            <div style="font-size:10px;color:${C.textLight};margin-top:2px;">
                                This receipt is officially valid and verified by MAK DC Investment
                            </div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;margin-top:14px;">
                        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;color:${C.jungleDark};border-bottom:1px dashed rgba(15,118,110,0.25);">
                            <span style="font-weight:600;">Verified By:</span>
                            <strong>${escReceipt(order.paymentVerifier?.fullName || 'Finance Department')}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;color:${C.jungleDark};border-bottom:1px dashed rgba(15,118,110,0.25);">
                            <span style="font-weight:600;">Reference:</span>
                            <strong style="font-family:monospace;">${escReceipt(order.paymentReference || '—')}</strong>
                        </div>
                        ${order.paymentVerifiedAt ? `
                        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;color:${C.jungleDark};border-bottom:1px dashed rgba(15,118,110,0.25);">
                            <span style="font-weight:600;">Verified At:</span>
                            <strong>${new Date(order.paymentVerifiedAt).toLocaleString()}</strong>
                        </div>` : ''}
                        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;color:${C.jungleDark};">
                            <span style="font-weight:600;">Method:</span>
                            <strong>${paymentMethod}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <!-- FOOTER -->
            <div style="padding:24px 44px 32px;border-top:2px dashed ${C.border};background:linear-gradient(180deg,#ffffff 0%,${C.bgLight} 100%);">

                <div style="text-align:center;margin-bottom:24px;">
                    <div style="font-size:18px;font-weight:900;color:${C.junglePrimary};margin-bottom:6px;letter-spacing:-0.5px;">
                        🙏 Thank You For Your Business!
                    </div>
                    <div style="font-size:11px;color:${C.textMuted};line-height:1.7;max-width:500px;margin:0 auto;">
                        This is a computer-generated receipt. No signature required.<br>
                        For inquiries or support, contact us at:
                    </div>
                    <div style="display:flex;justify-content:center;gap:20px;margin-top:10px;flex-wrap:wrap;">
                        <span style="font-size:11px;color:${C.jungleDark};font-weight:700;">📧 info@makdc.co.tz</span>
                        <span style="font-size:11px;color:${C.jungleDark};font-weight:700;">📞 +255 754 123 456</span>
                        <span style="font-size:11px;color:${C.jungleDark};font-weight:700;">🌐 www.makdc.co.tz</span>
                    </div>
                </div>

                <div style="display:flex;justify-content:space-around;gap:20px;margin-top:32px;">
                    <div style="flex:1;text-align:center;">
                        <div style="border-top:1.5px solid ${C.textMuted};padding-top:8px;font-size:10px;color:${C.textLight};font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                            Customer Signature
                        </div>
                    </div>
                    <div style="flex:1;text-align:center;">
                        <div style="border-top:1.5px solid ${C.textMuted};padding-top:8px;font-size:10px;color:${C.textLight};font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                            Authorized Signature
                        </div>
                    </div>
                </div>

                <div style="margin-top:24px;text-align:center;">
                    <div style="display:inline-block;padding:6px 16px;background:${C.jungleDark};border-radius:20px;">
                        <span style="font-size:9px;color:white;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
                            MAK DC Investment Company Limited • Official Receipt
                        </span>
                    </div>
                </div>

            </div>

            <!-- BOTTOM ACCENT BAR -->
            <div style="height:8px;background:linear-gradient(90deg,${C.gold} 0%,${C.jungleLight} 30%,${C.junglePrimary} 60%,${C.jungleDark} 100%);"></div>

        </div>
    `;
}
function printReceipt() {
    const receipt = window.__currentReceipt;
    if (!receipt) {
        console.warn('No receipt to print');
        return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
        alert('Please allow popups to print the receipt.');
        return;
    }

    printWindow.document.write('<!DOCTYPE html>' +
        '<html><head>' +
        '<title>Receipt ' + (receipt.receiptNumber || '') + '<\/title>' +
        '<meta charset="UTF-8">' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: Inter, Arial, sans-serif; padding: 20px; background: #f8fafc; }' +
        '@media print { body { padding: 0; background: white; } @page { margin: 10mm; size: A4; } }' +
        '<\/style><\/head>' +
        '<body>' + buildReceiptHTML(receipt) + '<\/body><\/html>');
    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 400);
}
function shareReceiptWhatsApp() {
    const receipt = window.__currentReceipt;
    if (!receipt) return;

    const phone = (receipt.phone || '').replace(/\D/g, '');
    const phoneIntl = phone.startsWith('0') ? '255' + phone.substring(1) : phone;

    const message = '*MAK DC INVESTMENT COMPANY LIMITED*\n\n' +
        '🧾 *OFFICIAL PAYMENT RECEIPT*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '*Receipt:* ' + (receipt.receiptNumber || '—') + '\n' +
        '*Order ID:* ' + (receipt.orderId || '—') + '\n' +
        '*Date:* ' + new Date().toLocaleDateString() + '\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '👤 *Customer:* ' + (receipt.customerName || '—') + '\n' +
        '📞 *Phone:* ' + (receipt.phone || '—') + '\n\n' +
        '🛒 *Items:*\n' +
        (receipt.items || []).map(i => '• ' + i.productName + ' × ' + i.quantity + ' = TSh ' + Number(i.subtotal || 0).toLocaleString()).join('\n') + '\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '*GRAND TOTAL: TSh ' + Number(receipt.totalAmount || 0).toLocaleString() + '*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '✅ *Payment Verified & Approved*\n\n' +
        'Thank you for doing business with MAK DC Investment Company!\n' +
        '_"Quality service is our priority."_\n\n' +
        '📞 +255 754 123 456\n' +
        '📧 info@makdc.co.tz';

    const url = phoneIntl
        ? 'https://wa.me/' + phoneIntl + '?text=' + encodeURIComponent(message)
        : 'https://wa.me/?text=' + encodeURIComponent(message);

    window.open(url, '_blank');
}
function downloadReceiptPDF() {
    const receipt = window.__currentReceipt;
    if (!receipt) {
        alert('No receipt to download');
        return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
        alert('Please allow popups to download receipt');
        return;
    }

    printWindow.document.write('<!DOCTYPE html>' +
        '<html><head>' +
        '<title>Receipt ' + (receipt.receiptNumber || '') + '<\/title>' +
        '<meta charset="UTF-8">' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: Inter, Arial, sans-serif; padding: 20px; background: white; }' +
        '@media print { body { padding: 0; } @page { margin: 10mm; size: A4; } }' +
        '<\/style><\/head>' +
        '<body>' + buildReceiptHTML(receipt) + '<\/body><\/html>');
    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        const overlay = printWindow.document.createElement('div');
        overlay.innerHTML = '<div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#0f766e;color:white;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);">💡 Chagua <strong>"Save as PDF"</strong> kwenye Print dialog</div>';
        printWindow.document.body.appendChild(overlay);

        setTimeout(() => {
            printWindow.print();
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 1000);
        }, 500);
    }, 400);
}
function downloadReceipt() {
    downloadReceiptPDF();
}
function escReceipt(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.showReceiptModal = showReceiptModal;
window.closeReceiptModal = closeReceiptModal;
window.printReceipt = printReceipt;
window.downloadReceipt = downloadReceipt;
window.downloadReceiptPDF = downloadReceiptPDF;
window.shareReceiptWhatsApp = shareReceiptWhatsApp;
window.buildReceiptHTML = buildReceiptHTML;