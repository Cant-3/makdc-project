// backend/services/email.service.js
const nodemailer = require('nodemailer');

// 1. Tengeneza Transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true kwa port 465, false kwa port 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// 2. Email kwa ajili ya Admin (Wewe)
async function sendAdminOrderAlert(order) {
    try {
        const itemsList = order.items.map(item => 
            `<li>${item.productName} - Qty: ${item.quantity} - TSh ${Number(item.subtotal).toLocaleString()}</li>`
        ).join('');

        const mailOptions = {
            from: `"MAK DC System" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: `🚨 ODA MPYA: ${order.orderId} - ${order.customerName}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;">
                    <h2 style="color: #0288D1; border-bottom: 2px solid #0288D1; padding-bottom: 10px;">Oda Mpya Imepokelewa!</h2>
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Mteja:</strong> ${order.customerName}</p>
                    <p><strong>Simu:</strong> ${order.phone}</p>
                    <p><strong>Mahali:</strong> ${order.district}, ${order.region}</p>
                    
                    <h3 style="color: #333;">Bidhaa Zilizoagizwa:</h3>
                    <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                        ${itemsList}
                    </ul>
                    
                    <h3 style="color: #0288D1;">JUMLA: TSh ${Number(order.totalAmount).toLocaleString()}</h3>
                    
                    <br>
                    <a href="https://makdcinvestments.co.tz/super-admin-dashboard.html" style="background: #0288D1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Nenda Kwenye Dashboard</a>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email ya oda mpya imetumwa kwa Admin (${process.env.ADMIN_EMAIL})`);
    } catch (error) {
        console.error('❌ Imeshindikana kutuma email kwa Admin:', error);
    }
}

// 3. Email kwa ajili ya Mteja
async function sendCustomerReceipt(order) {
    try {
        const mailOptions = {
            from: `"MAK DC Investment" <${process.env.EMAIL_USER}>`,
            to: order.email,
            subject: `✅ Oda Yako Imepokelewa - ${order.orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;">
                    <h2 style="color: #0288D1;">Asante ${order.customerName}!</h2>
                    <p>Tumepokea oda yako kwa mafanikio. Hii hapa ni Tracking ID yako:</p>
                    
                    <div style="background: #f4f9fd; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="color: #01579B; letter-spacing: 3px; margin: 0;">${order.orderId}</h1>
                    </div>
                    
                    <p>Tafadhali tumia Tracking ID hii kufuatilia hali ya oda yako kwenye tovuti yetu.</p>
                    <p><strong>Jumla:</strong> TSh ${Number(order.totalAmount).toLocaleString()}</p>
                    <p><strong>Hali:</strong> Inasubiri Ukaguzi (Pending)</p>
                    
                    <br>
                    <a href="https://makdcinvestments.co.tz/customer-portal.html" style="background: #0288D1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Fuatilia Oda Yako</a>
                    
                    <p style="font-size: 12px; color: #888; margin-top: 30px;">MAK DC Investment Company LTD<br>Quality service is our priority.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email ya uthibitisho imetumwa kwa mteja (${order.email})`);
    } catch (error) {
        console.error(`❌ Imeshindikana kutuma email kwa mteja (${order.email}):`, error);
    }
}

module.exports = { sendAdminOrderAlert, sendCustomerReceipt };