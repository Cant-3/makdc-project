// backend/services/email.service.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// ================================================================
// 1. EMAIL KWA AJILI YA ADMIN (Wewe)
// ================================================================
async function sendAdminOrderAlert(order) {
    try {
        const items = order.items || [];
        const itemsList = items.map(item => 
            `<tr>
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #333;">${item.productName}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: center; color: #333;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: right; color: #333;">TSh ${Number(item.subtotal).toLocaleString()}</td>
            </tr>`
        ).join('');

        const { data, error } = await resend.emails.send({
            from: 'MAK DC System <orders@makdcinvestments.co.tz>', 
            to: [process.env.ADMIN_EMAIL],
            subject: `🚨 ODA MPYA: ${order.orderId} - ${order.customerName}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    
                    <!-- Header na Logo -->
                    <div style="background-color: #01579B; padding: 25px 20px; text-align: center;">
                        <img src="https://makdcinvestments.co.tz/makdc-logo.jpg" alt="MAK DC Logo" style="max-height: 60px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;">
                        <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: 1px;">MAK DC INVESTMENT</h1>
                        <p style="color: #e1f5fe; margin: 5px 0 0 0; font-size: 14px;">Mfumo wa Usimamizi wa Oda</p>
                    </div>
                    
                    <!-- Body -->
                    <div style="padding: 30px 20px; background-color: #ffffff;">
                        <h2 style="color: #333; margin-top: 0; font-size: 20px;">Habari Admin,</h2>
                        <p style="color: #555; line-height: 1.6; font-size: 15px;">Mteja ameweka oda mpya kupitia mfumo. Tafadhali pitia taarifa zifuatazo ili kuendelea na mchakato wa ukaguzi:</p>
                        
                        <table style="width: 100%; margin-bottom: 25px; border-collapse: collapse; background-color: #f9f9f9; border-radius: 8px;">
                            <tr>
                                <td style="padding: 12px; color: #555; width: 40%;"><strong>Namba ya Oda:</strong></td>
                                <td style="padding: 12px; color: #01579B; font-weight: bold;">${order.orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px; color: #555;"><strong>Jina la Mteja:</strong></td>
                                <td style="padding: 12px; color: #333;">${order.customerName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px; color: #555;"><strong>Namba ya Simu:</strong></td>
                                <td style="padding: 12px; color: #333;">${order.phone}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px; color: #555;"><strong>Mahali:</strong></td>
                                <td style="padding: 12px; color: #333;">${order.district || ''}, ${order.region || ''}</td>
                            </tr>
                        </table>

                        <h3 style="color: #01579B; border-bottom: 2px solid #01579B; padding-bottom: 8px; margin-bottom: 15px;">Bidhaa Zilizoagizwa</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                            <thead>
                                <tr style="background-color: #e1f5fe;">
                                    <th style="padding: 12px; text-align: left; color: #01579B; font-size: 14px;">Bidhaa</th>
                                    <th style="padding: 12px; text-align: center; color: #01579B; font-size: 14px;">Idadi</th>
                                    <th style="padding: 12px; text-align: right; color: #01579B; font-size: 14px;">Bei (TSh)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsList}
                            </tbody>
                        </table>

                        <!-- Jumla -->
                        <div style="background-color: #fff8e1; border-left: 5px solid #FFC107; padding: 15px; border-radius: 4px; margin-bottom: 30px;">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="color: #333; font-size: 16px; font-weight: bold;">JUMLA KUU:</td>
                                    <td style="text-align: right; color: #D84315; font-size: 20px; font-weight: bold;">TSh ${Number(order.totalAmount).toLocaleString()}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Kitufe -->
                        <div style="text-align: center;">
                            <a href="https://makdcinvestments.co.tz/super-admin-dashboard.html" style="background-color: #01579B; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px; display: inline-block;">Ingia Kwenye Dashboard</a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f1f1f1; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                        <p style="margin: 0; font-size: 12px; color: #777;">Ujumbe huu umetumwa kiotomatiki na Mfumo wa MAK DC Investment.<br>Tafadhali usijibu barua pepe hii moja kwa moja.</p>
                    </div>
                </div>
            `
        });

        if (error) console.error('❌ Admin Email Error:', error);
        else console.log(`✅ Email ya Admin imetumwa:`, data.id);
    } catch (error) {
        console.error('❌ Kosa la mfumo (Admin):', error.message);
    }
}

// ================================================================
// 2. EMAIL KWA AJILI YA MTEJA (Risiti na Shukrani)
// ================================================================
async function sendCustomerReceipt(order) {
    try {
        if (!order.email) return;

        const { data, error } = await resend.emails.send({
            from: 'MAK DC Investment <no-reply@makdcinvestments.co.tz>',
            to: [order.email],
            subject: `Asante kwa Oda Yako - MAK DC Investment (${order.orderId})`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    
                    <!-- Header na Logo -->
                    <div style="background-color: #01579B; padding: 25px 20px; text-align: center;">
                        <img src="https://makdcinvestments.co.tz/makdc-logo.jpg" alt="MAK DC Logo" style="max-height: 60px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;">
                        <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: 1px;">MAK DC INVESTMENT</h1>
                    </div>
                    
                    <!-- Body -->
                    <div style="padding: 30px 20px; background-color: #ffffff;">
                        <h2 style="color: #333; margin-top: 0; font-size: 20px;">Ndugu ${order.customerName},</h2>
                        <p style="color: #555; line-height: 1.6; font-size: 15px;">Kwanza kabisa, tunakushukuru kwa kutuamini na kuchagua MAK DC Investment kwa mahitaji yako. Tunafurahi kukutaarifu kuwa <strong>tumepokea oda yako kwa mafanikio</strong> na timu yetu inaifanyia kazi kwa sasa.</p>
                        
                        <!-- Tracking ID Box -->
                        <div style="background-color: #e1f5fe; padding: 25px 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 1px dashed #0288D1;">
                            <p style="margin: 0 0 10px 0; color: #01579B; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Namba Yako ya Kufuatilia (Tracking ID)</p>
                            <h1 style="color: #D32F2F; letter-spacing: 3px; margin: 0; font-size: 32px;">${order.orderId}</h1>
                        </div>
                        
                        <p style="color: #555; line-height: 1.6; font-size: 15px;">Tafadhali hifadhi namba hii mahali salama. Unaweza kuitumia kufuatilia hatua mbalimbali za oda yako (kama vile ukaguzi, malipo, na usafirishaji) kupitia tovuti yetu au kwa kuwasiliana na timu yetu ya huduma kwa wateja.</p>
                        
                        <!-- Order Summary -->
                        <h3 style="color: #01579B; border-bottom: 2px solid #01579B; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px;">Muhtasari wa Oda</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 12px 0; color: #555; border-bottom: 1px solid #eee;">Jumla ya Kiasi:</td>
                                <td style="padding: 12px 0; text-align: right; color: #333; font-weight: bold; border-bottom: 1px solid #eee; font-size: 16px;">TSh ${Number(order.totalAmount).toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; color: #555;">Hali ya Oda:</td>
                                <td style="padding: 12px 0; text-align: right;"><span style="background-color: #fff8e1; color: #F57F17; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid #FFC107;">Inasubiri Ukaguzi</span></td>
                            </tr>
                        </table>

                        <!-- Kitufe -->
                        <div style="text-align: center; margin-top: 35px;">
                            <a href="https://makdcinvestments.co.tz/customer-portal.html" style="background-color: #01579B; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px; display: inline-block;">Fuatilia Oda Yako Hapa</a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f1f1f1; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #333; font-weight: bold;">MAK DC Investment Company LTD</p>
                        <p style="margin: 0 0 10px 0; font-size: 13px; color: #555;">Huduma Bora ni Kipaumbele Chetu.</p>
                        <p style="margin: 0; font-size: 12px; color: #888;">Kama una swali lolote, tafadhali wasiliana nasi kupitia barua pepe: <a href="mailto:support@makdcinvestments.co.tz" style="color: #01579B; text-decoration: none;">support@makdcinvestments.co.tz</a></p>
                    </div>
                </div>
            `
        });

        if (error) console.error(`❌ Customer Email Error:`, error);
        else console.log(`✅ Email ya Mteja imetumwa:`, data.id);
    } catch (error) {
        console.error(`❌ Kosa la mfumo (Customer):`, error.message);
    }
}

// ================================================================
// FUNCTIONS ZA HATUA MBALIMBALI ZA WORKFLOW (Sales, Finance, Manager, CEO)
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
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
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

async function sendSalesNewOrder(order) {
    await sendWorkflowEmail({
        to: process.env.SALES_EMAIL,
        subject: `🔔 ODA MPYA: ${order.orderId}`,
        title: 'Oda Mpya Inasubiri Ukaguzi',
        message: 'Habari timu ya Sales, kuna oda mpya imeingia kupitia mfumo. Tafadhali kagua taarifa za mteja na bidhaa, kisha uwasilishe kwa Finance.',
        order, actionUrl: 'https://makdcinvestments.co.tz/sales-dashboard.html',
        actionText: 'Nenda Kwenye Sales Dashboard', badgeColor: '#F57F17'
    });
}

async function sendFinanceNewOrder(order) {
    await sendWorkflowEmail({
        to: process.env.FINANCE_EMAIL,
        subject: `💰 ODA IMETHIBITISHWA: ${order.orderId}`,
        title: 'Inasubiri Ukaguzi wa Malipo',
        message: 'Habari Finance, oda hii imekaguliwa na kuwasilishwa na timu ya Sales. Tafadhali kagua malipo na uthibitishe ili iende kwa Manager.',
        order, actionUrl: 'https://makdcinvestments.co.tz/finance-dashboard.html',
        actionText: 'Nenda Kwenye Finance Dashboard', badgeColor: '#D32F2F'
    });
}

async function sendManagerApproval(order) {
    await sendWorkflowEmail({
        to: process.env.MANAGER_EMAIL,
        subject: `📝 ODA INAHITAJI IDHINI: ${order.orderId}`,
        title: 'Inasubiri Idhini ya Manager',
        message: 'Habari Manager, malipo ya oda hii yamethibitishwa na Finance. Tafadhali pitia taarifa na upe idhini ili iende kwa CEO kwa idhini ya mwisho.',
        order, actionUrl: 'https://makdcinvestments.co.tz/manager-dashboard.html',
        actionText: 'Nenda Kwenye Manager Dashboard', badgeColor: '#7B1FA2'
    });
}

async function sendCEOApproval(order) {
    await sendWorkflowEmail({
        to: process.env.CEO_EMAIL,
        subject: `👑 IDHINI YA MWISHO: ${order.orderId}`,
        title: 'Inasubiri Idhini ya CEO',
        message: 'Habari CEO, oda hii imekamilika kikaguzi na imethibitishwa na Manager. Tafadhali toa idhini ya mwisho ili mzigo uanze kusafirishwa.',
        order, actionUrl: 'https://makdcinvestments.co.tz/ceo-dashboard.html',
        actionText: 'Nenda Kwenye CEO Dashboard', badgeColor: '#2E7D32'
    });
}

async function sendOrderApprovedForDelivery(order) {
    await sendWorkflowEmail({
        to: process.env.SALES_EMAIL,
        subject: `📦 ODA TAYARI KUSAFIRISHWA: ${order.orderId}`,
        title: 'Oda Imeidhinishwa',
        message: 'Habari, CEO ameidhinisha oda hii. Mzigo uko tayari kwa ajili ya usafirishaji. Tafadhali wasiliana na mteja kwa maelekezo ya usafirishaji.',
        order, actionUrl: 'https://makdcinvestments.co.tz/delivery-dashboard.html',
        actionText: 'Nenda Kwenye Delivery Dashboard', badgeColor: '#0288D1'
    });
}

module.exports = {
    sendAdminOrderAlert,
    sendCustomerReceipt,
    sendSalesNewOrder,
    sendFinanceNewOrder,
    sendManagerApproval,
    sendCEOApproval,
    sendOrderApprovedForDelivery
};