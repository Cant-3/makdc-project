// backend/services/email.service.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// ================================================================
// HEADER YA KAMPUNI (Blue + Gold Theme)
// ================================================================
const companyHeader = `
    <div style="background-color: #01579B; padding: 25px 20px 15px 20px; text-align: center; border-top: 6px solid #FFC107;">
        <div style="background-color: #ffffff; display: inline-block; padding: 10px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            <img src="https://makdcinvestments.co.tz/logo.png" alt="MAK DC Investment" style="max-width: 180px; height: auto; display: block;">
        </div>
        <h1 style="color: #FFC107; margin: 0 0 5px 0; font-size: 22px; letter-spacing: 1px; font-weight: bold;">MAK DC INVESTMENT COMPANY LIMITED</h1>
        <p style="color: #ffffff; margin: 0 0 3px 0; font-size: 13px;"><strong>Simu Na:</strong> +255 796 220 796 / +255 796 220 795</p>
        <p style="color: #ffffff; margin: 0 0 3px 0; font-size: 13px;"><strong>Barua Pepe:</strong> <a href="mailto:ceo@makdcic.co.tz" style="color: #FFC107; text-decoration: none;">ceo@makdcic.co.tz</a></p>
        <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 13px;"><strong>Tovuti:</strong> <a href="http://www.makdcic.co.tz" style="color: #FFC107; text-decoration: none;">http://www.makdcic.co.tz</a></p>
        <p style="color: #e1f5fe; margin: 0; font-size: 12px; line-height: 1.4;">Ofisi ya Mtendaji Mkuu, Mak DC Investment Co. LTD,<br>2 Barabara ya Mahakama 3-Ngiu, 59501 IWAWA, MAKETE, S.L. P 88, <strong>MAKETE</strong>.</p>
    </div>
    <div style="height: 4px; background-color: #FFC107;"></div>
`;

const companyFooter = `
    <div style="background-color: #f1f1f1; padding: 15px 20px; text-align: center; border-top: 2px solid #01579B; font-size: 12px; color: #777;">
        <p style="margin: 0;">Ujumbe huu umetumwa kiotomatiki na Mfumo wa MAK DC Investment.</p>
        <p style="margin: 5px 0 0 0;">Quality Service is Our Priority</p>
    </div>
`;

// ================================================================
// 1. EMAIL KWA AJILI YA CEO (Executive Alert)
// ================================================================
async function sendCEOAlert(order) {
    try {
        const items = order.items || [];
        const itemsList = items.map(item => 
            `<tr>
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">${item.productName}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: right;">TSh ${Number(item.subtotal).toLocaleString()}</td>
            </tr>`
        ).join('');

        const { data, error } = await resend.emails.send({
            from: 'MAK DC System <orders@makdcinvestments.co.tz>', 
            to: [process.env.CEO_EMAIL],
            subject: `👑 TAARIFA YA CEO: Oda Mpya #${order.orderId} imeingia`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #FFC107; border-radius: 10px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    ${companyHeader}
                    
                    <div style="padding: 30px 20px;">
                        <!-- Heshima kwa CEO -->
                        <h2 style="color: #01579B; margin-top: 0; font-size: 22px; border-bottom: 2px solid #e1f5fe; padding-bottom: 10px;">Kwa Heshima, Mkurugenzi Mkuu (CEO),</h2>
                        <p style="color: #555; line-height: 1.6; font-size: 15px;">Tunapenda kukutaarifu kuwa kuna <strong>Oda Mpya</strong> imeingia kupitia mfumo. Hapa kuna muhtasari wa haraka kwa ajili ya uangalizi wako:</p>
                        
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #FFC107;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #555; width: 40%;"><strong>Namba ya Oda:</strong></td>
                                    <td style="padding: 8px 0; color: #01579B; font-weight: bold; font-size: 16px;">${order.orderId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #555;"><strong>Mteja:</strong></td>
                                    <td style="padding: 8px 0; color: #333;">${order.customerName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #555;"><strong>Jumla ya Kiasi:</strong></td>
                                    <td style="padding: 8px 0; color: #D84315; font-weight: bold; font-size: 18px;">TSh ${Number(order.totalAmount).toLocaleString()}</td>
                                </tr>
                            </table>
                        </div>

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

                        <div style="text-align: center;">
                            <a href="https://makdcinvestments.co.tz/super-admin-dashboard.html" style="background-color: #FFC107; color: #01579B; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">Fungua Dashboard ya CEO</a>
                        </div>
                    </div>
                    
                    ${companyFooter}
                </div>
            `
        });

        if (error) console.error('❌ CEO Email Error:', error);
        else console.log(`✅ Email ya CEO imetumwa:`, data.id);
    } catch (error) {
        console.error('❌ Kosa la mfumo (CEO):', error.message);
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
                    ${companyHeader}
                    
                    <div style="padding: 30px 20px; background-color: #ffffff;">
                        <h2 style="color: #01579B; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e1f5fe; padding-bottom: 10px;">Ndugu ${order.customerName},</h2>
                        <p style="color: #555; line-height: 1.6; font-size: 15px;">Kwanza kabisa, tunakushukuru kwa kutuamini na kuchagua MAK DC Investment kwa mahitaji yako. Tunafurahi kukutaarifu kuwa <strong>tumepokea oda yako kwa mafanikio</strong> na timu yetu inaifanyia kazi kwa sasa.</p>
                        
                        <div style="background-color: #e1f5fe; padding: 25px 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 1px dashed #0288D1;">
                            <p style="margin: 0 0 10px 0; color: #01579B; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Namba Yako ya Kufuatilia (Tracking ID)</p>
                            <h1 style="color: #D32F2F; letter-spacing: 3px; margin: 0; font-size: 32px;">${order.orderId}</h1>
                        </div>
                        
                        <p style="color: #555; line-height: 1.6; font-size: 15px;">Tafadhali hifadhi namba hii mahali salama. Unaweza kuitumia kufuatilia hatua mbalimbali za oda yako (kama vile ukaguzi, malipo, na usafirishaji) kupitia tovuti yetu au kwa kuwasiliana na timu yetu ya huduma kwa wateja.</p>
                        
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

                        <div style="text-align: center; margin-top: 35px;">
                            <a href="https://makdcinvestments.co.tz/customer-portal.html" style="background-color: #01579B; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px; display: inline-block;">Fuatilia Oda Yako Hapa</a>
                        </div>
                    </div>
                    
                    ${companyFooter}
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
// 3. WORKFLOW EMAILS (Kwa heshima kwa kila Idara)
// ================================================================
async function sendWorkflowEmail({ to, subject, title, message, order, actionUrl, actionText, badgeColor }) {
    try {
        if (!to) {
            console.warn(`⚠️ Barua pepe ya mpokeaji haipo kwa ajili ya: ${title}. Haijatumwa.`);
            return;
        }

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
            cc: [process.env.CEO_EMAIL], // CEO anapokea CC
            subject: subject,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    ${companyHeader}
                    
                    <div style="padding: 30px 20px;">
                        <span style="background-color: ${badgeColor}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${title}</span>
                        
                        <!-- Heshima kwa mpokeaji -->
                        <h2 style="color: #333; margin-top: 15px;">Kwa Heshima, ${title},</h2>
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
                    
                    ${companyFooter}
                </div>
            `
        });

        if (error) console.error(`❌ Email Error (${to}):`, error);
        else console.log(`✅ Email imetumwa kwa ${to} (CC: CEO)`, data.id);
    } catch (error) {
        console.error('❌ Kosa la mfumo (Workflow Email):', error.message);
    }
}

// ================================================================
// 4. FUNCTIONS ZENYE HESHIMA KWA KILA IDARA
// ================================================================

async function sendSalesNewOrder(order) {
    await sendWorkflowEmail({
        to: process.env.SALES_EMAIL,
        subject: `🔔 ODA MPYA: ${order.orderId}`,
        title: 'Mkuu wa Kitengo cha Mauzo',
        message: 'Kuna oda mpya imeingia kupitia mfumo. Tafadhali kagua taarifa za mteja na bidhaa, kisha uwasilishe kwa Idara ya Fedha kwa ajili ya ukaguzi wa malipo.',
        order, actionUrl: 'https://makdcinvestments.co.tz/sales-dashboard.html',
        actionText: 'Nenda Kwenye Sales Dashboard', badgeColor: '#F57F17'
    });
}

async function sendFinanceNewOrder(order) {
    await sendWorkflowEmail({
        to: process.env.FINANCE_EMAIL,
        subject: `💰 ODA IMETHIBITISHWA: ${order.orderId}`,
        title: 'Mkuu wa Idara ya Fedha',
        message: 'Oda hii imekaguliwa na kuwasilishwa na timu ya Mauzo. Tafadhali kagua malipo na uthibitishe ili iende kwa Meneja Uendeshaji.',
        order, actionUrl: 'https://makdcinvestments.co.tz/finance-dashboard.html',
        actionText: 'Nenda Kwenye Finance Dashboard', badgeColor: '#D32F2F'
    });
}

async function sendManagerApproval(order) {
    await sendWorkflowEmail({
        to: process.env.MANAGER_EMAIL,
        subject: `📝 ODA INAHITAJI IDHINI: ${order.orderId}`,
        title: 'Meneja Uendeshaji',
        message: 'Malipo ya oda hii yamethibitishwa na Idara ya Fedha. Tafadhali pitia taarifa na upe idhini ili iende kwa CEO kwa idhini ya mwisho.',
        order, actionUrl: 'https://makdcinvestments.co.tz/manager-dashboard.html',
        actionText: 'Nenda Kwenye Manager Dashboard', badgeColor: '#7B1FA2'
    });
}

async function sendOrderApprovedForDelivery(order) {
    await sendWorkflowEmail({
        to: process.env.SALES_EMAIL,
        subject: `📦 ODA TAYARI KUSAFIRISHWA: ${order.orderId}`,
        title: 'Timu ya Usafirishaji (Delivery)',
        message: 'CEO ameidhinisha oda hii. Mzigo uko tayari kwa ajili ya usafirishaji. Tafadhali wasiliana na mteja kwa maelekezo ya usafirishaji.',
        order, actionUrl: 'https://makdcinvestments.co.tz/delivery-dashboard.html',
        actionText: 'Nenda Kwenye Delivery Dashboard', badgeColor: '#0288D1'
    });
}

module.exports = {
    sendCEOAlert,
    sendCustomerReceipt,
    sendSalesNewOrder,
    sendFinanceNewOrder,
    sendManagerApproval,
    sendOrderApprovedForDelivery
};