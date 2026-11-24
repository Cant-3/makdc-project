// backend/services/email.service.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// ================================================================
// FUNCTION KUU YA KUTUMA EMAIL (Inatumiwa na hatua zote)
// ================================================================
async function sendWorkflowEmail({ to, subject, title, message, order, actionUrl, actionText, badgeColor }) {
    try {
        const items = order.items || [];
        const itemsList = items.map(item => 
            `<tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">TSh ${Number(item.subtotal).toLocaleString()}</td>
            </tr>`
        ).join('');

        const { data, error } = await resend.emails.send({
            from: 'MAK DC System <orders@makdcinvestments.co.tz>',
            to: [to],
            subject: subject,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                    <div style="background-color: #01579B; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 22px;">MAK DC INVESTMENT</h1>
                        <p style="color: #e1f5fe; margin: 5px 0 0 0;">Mfumo wa Usimamizi wa Oda</p>
                    </div>
                    
                    <div style="padding: 30px 20px;">
                        <span style="background-color: ${badgeColor}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${title}</span>
                        <h2 style="color: #333; margin-top: 15px;">Habari,</h2>
                        <p style="color: #555; line-height: 1.6; font-size: 15px;">${message}</p>
                        
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Oda Namba:</strong> <span style="color: #01579B; font-weight: bold;">${order.orderId}</span></p>
                            <p style="margin: 5px 0;"><strong>Mteja:</strong> ${order.customerName}</p>
                            <p style="margin: 5px 0;"><strong>Jumla:</strong> TSh ${Number(order.totalAmount).toLocaleString()}</p>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                            <thead>
                                <tr style="background-color: #e1f5fe;">
                                    <th style="padding: 10px; text-align: left; color: #01579B;">Bidhaa</th>
                                    <th style="padding: 10px; text-align: center; color: #01579B;">Idadi</th>
                                    <th style="padding: 10px; text-align: right; color: #01579B;">Bei</th>
                                </tr>
                            </thead>
                            <tbody>${itemsList}</tbody>
                        </table>

                        <div style="text-align: center; margin-top: 30px;">
                            <a href="${actionUrl}" style="background-color: #01579B; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">${actionText}</a>
                        </div>
                    </div>
                    
                    <div style="background-color: #f1f1f1; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0;">
                        <p style="margin: 0; font-size: 12px; color: #777;">Ujumbe huu umetumwa kiotomatiki na Mfumo wa MAK DC.</p>
                    </div>
                </div>
            `
        });

        if (error) console.error(`❌ Email Error (${to}):`, error);
        else console.log(`✅ Email imetumwa kwa ${to}`, data.id);
    } catch (error) {
        console.error('❌ Kosa la mfumo:', error.message);
    }
}

// ================================================================
// FUNCTIONS ZA HATUA MBALIMBALI (Tutaita hizi kwenye Controller)
// ================================================================

// 1. Sales Anapokea Oda Mpya (Badala ya Admin Alert ya awali)
async function sendSalesNewOrder(order) {
    await sendWorkflowEmail({
        to: process.env.SALES_EMAIL, // Itawekwa kwenye Render Environment
        subject: `🔔 ODA MPYA: ${order.orderId}`,
        title: 'Oda Mpya Inasubiri Ukaguzi',
        message: 'Habari timu ya Sales, kuna oda mpya imeingia kupitia mfumo. Tafadhali kagua taarifa za mteja na bidhaa, kisha uwasilishe kwa Finance.',
        order,
        actionUrl: 'https://makdcinvestments.co.tz/sales-dashboard.html',
        actionText: 'Nenda Kwenye Sales Dashboard',
        badgeColor: '#F57F17' // Rangi ya Njano
    });
}

// 2. Finance Anapokea Oda Kutoka kwa Sales
async function sendFinanceNewOrder(order) {
    await sendWorkflowEmail({
        to: process.env.FINANCE_EMAIL,
        subject: `💰 ODA IMETHIBITISHWA: ${order.orderId}`,
        title: 'Inasubiri Ukaguzi wa Malipo',
        message: 'Habari Finance, oda hii imekaguliwa na kuwasilishwa na timu ya Sales. Tafadhali kagua malipo na uthibitishe ili iende kwa Manager.',
        order,
        actionUrl: 'https://makdcinvestments.co.tz/finance-dashboard.html',
        actionText: 'Nenda Kwenye Finance Dashboard',
        badgeColor: '#D32F2F' // Rangi Nyekundu
    });
}

// 3. Manager Anapokea Oda Kutoka kwa Finance
async function sendManagerApproval(order) {
    await sendWorkflowEmail({
        to: process.env.MANAGER_EMAIL,
        subject: `📝 ODA INAHITAJI IDHINI: ${order.orderId}`,
        title: 'Inasubiri Idhini ya Manager',
        message: 'Habari Manager, malipo ya oda hii yamethibitishwa na Finance. Tafadhali pitia taarifa na upe idhini ili iende kwa CEO kwa idhini ya mwisho.',
        order,
        actionUrl: 'https://makdcinvestments.co.tz/manager-dashboard.html',
        actionText: 'Nenda Kwenye Manager Dashboard',
        badgeColor: '#7B1FA2' // Rangi ya Zambarau
    });
}

// 4. CEO Anapokea Oda Kutoka kwa Manager
async function sendCEOApproval(order) {
    await sendWorkflowEmail({
        to: process.env.CEO_EMAIL,
        subject: `👑 IDHINI YA MWISHO: ${order.orderId}`,
        title: 'Inasubiri Idhini ya CEO',
        message: 'Habari CEO, oda hii imekamilika kikaguzi na imethibitishwa na Manager. Tafadhali toa idhini ya mwisho ili mzigo uanze kusafirishwa.',
        order,
        actionUrl: 'https://makdcinvestments.co.tz/ceo-dashboard.html',
        actionText: 'Nenda Kwenye CEO Dashboard',
        badgeColor: '#2E7D32' // Rangi ya Kijani
    });
}

// 5. Sales na Delivery Wanapokea Taarifa Kuwa Oda Imeidhinishwa
async function sendOrderApprovedForDelivery(order) {
    await sendWorkflowEmail({
        to: process.env.SALES_EMAIL, // Au unaweza kutuma kwa delivery email
        subject: `📦 ODA TAYARI KUSAFIRISHWA: ${order.orderId}`,
        title: 'Oda Imeidhinishwa',
        message: 'Habari, CEO ameidhinisha oda hii. Mzigo uko tayari kwa ajili ya usafirishaji. Tafadhali wasiliana na mteja kwa maelekezo ya usafirishaji.',
        order,
        actionUrl: 'https://makdcinvestments.co.tz/delivery-dashboard.html',
        actionText: 'Nenda Kwenye Delivery Dashboard',
        badgeColor: '#0288D1' // Rangi ya Bluu
    });
}

module.exports = {
    sendAdminOrderAlert, // Ya awali
    sendCustomerReceipt, // Ya awali
    sendSalesNewOrder,
    sendFinanceNewOrder,
    sendManagerApproval,
    sendCEOApproval,
    sendOrderApprovedForDelivery
};