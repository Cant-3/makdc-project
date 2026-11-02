// ================================================================
// MAK DC INVESTMENT — PROCUREMENT PERMIT PDF
// ================================================================

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'imprests');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// PATH YA LOGO: Badilisha hii kama folda zako zimekaa tofauti
const LOGO_PATH = path.join(__dirname, '..', '..', 'frontend', 'assets', 'makdc-logo.jpg');

// ================================================================
// 1. GENERATE IMPREST NUMBER (Hii ilikosekana!)
// ================================================================
async function generateImprestNumber(query) {
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT COUNT(*) as count FROM procurement_imprests WHERE imprest_number LIKE $1`,
    [`IMP-${year}-%`]
  );
  const count = parseInt(result[0].count) + 1;
  return `IMP-${year}-${String(count).padStart(3, '0')}`;
}

// ================================================================
// 2. GENERATE PERMIT PDF
// ================================================================
async function generatePermitPDF(data) {
  const {
    permitNumber, requestNumber, department, requestedBy, title,
    items, totalAmount, approvedByCeo, approvedAt, qrCodeData
  } = data;

  const filename = `${permitNumber}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const pageWidth = doc.page.width; // 595.28
      const pageHeight = doc.page.height; // 841.89
      
      // Rangi
      const primaryColor = '#052e16'; // Green nyeusi
      const goldColor = '#fbbf24'; // Gold/Yellow
      const grayColor = '#64748b';
      const lightGray = '#f8fafc';
      const borderColor = '#e2e8f0';

      // ===== BACKGROUND WATERMARK =====
      doc.save();
      doc.translate(pageWidth / 2, pageHeight / 2);
      doc.rotate(-35);
      doc.fontSize(60).font('Helvetica-Bold');
      doc.fillColor(primaryColor).fillOpacity(0.04);
      doc.text('MAK DC INVESTMENT', -250, -50);
      doc.text('PROCUREMENT PERMIT', -230, 20);
      doc.restore();

      // ===== HEADER (Green Banner) =====
      doc.rect(0, 0, pageWidth, 80).fill(primaryColor);
      
      // Logo (Duara Jeupe)
      let textStartX = 40;
      if (fs.existsSync(LOGO_PATH)) {
          doc.circle(55, 40, 24).fill('white');
          doc.image(LOGO_PATH, 31, 16, { width: 48, height: 48 });
          textStartX = 90;
      }

      // Maandishi ya Kampuni
      doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
         .text('MAK DC INVESTMENT LTD', textStartX, 25);
      doc.fillColor(goldColor).fontSize(9).font('Helvetica-Oblique')
         .text('"Quality service is our priority."', textStartX, 50);

      // Badge ya Permit (Kulia)
      doc.roundedRect(pageWidth - 180, 20, 150, 40, 6).fill(goldColor);
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
         .text('OFFICIAL', pageWidth - 170, 26, { width: 130, align: 'center' });
      doc.fontSize(13).text('PROCUREMENT PERMIT', pageWidth - 170, 38, { width: 130, align: 'center' });

      // ===== PERMIT INFO GRID =====
      let y = 100;
      
      // Mistari ya juu
      doc.moveTo(40, y).lineTo(pageWidth - 40, y).lineWidth(1.5).strokeColor(primaryColor).stroke();
      y += 10;

      // Permit & Request No
      doc.fillColor(grayColor).fontSize(8).font('Helvetica-Bold').text('PERMIT NO.', 40, y);
      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text(permitNumber, 40, y + 10);
      
      doc.fillColor(grayColor).fontSize(8).font('Helvetica-Bold').text('REQUEST NO.', pageWidth - 200, y, { width: 160, align: 'right' });
      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text(requestNumber, pageWidth - 200, y + 10, { width: 160, align: 'right' });

      y += 35;
      doc.moveTo(40, y).lineTo(pageWidth - 40, y).lineWidth(0.5).strokeColor(borderColor).stroke();
      y += 10;

      // Department, Requested By, Date
      const colW = (pageWidth - 80) / 3;
      
      doc.fillColor(grayColor).fontSize(8).font('Helvetica-Bold').text('DEPARTMENT', 40, y);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text(department || '—', 40, y + 10);
      
      doc.fillColor(grayColor).fontSize(8).font('Helvetica-Bold').text('REQUESTED BY', 40 + colW, y);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text(requestedBy || '—', 40 + colW, y + 10);
      
      doc.fillColor(grayColor).fontSize(8).font('Helvetica-Bold').text('DATE ISSUED', 40 + (colW * 2), y);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text(new Date(approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), 40 + (colW * 2), y + 10);

      y += 30;
      doc.moveTo(40, y).lineTo(pageWidth - 40, y).lineWidth(0.5).strokeColor(borderColor).stroke();
      y += 10;

      // Subject (Title)
      doc.fillColor(grayColor).fontSize(8).font('Helvetica-Bold').text('SUBJECT', 40, y);
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text(title || '—', 40, y + 12);
      y += 35;

      // ===== INFO BOX =====
      doc.roundedRect(40, y, pageWidth - 80, 30, 4).fillAndStroke('#fef3c7', '#fde68a'); // Yellowish background
      doc.fillColor('#b45309').fontSize(8).font('Helvetica')
         .text('This is an Official Procurement Permit issued by MAK DC Investment Ltd authorizing the purchase of the goods/services listed below. This permit is the sole authorization allowing the respective department to commence this procurement process in accordance with company policy.', 50, y + 8, { width: pageWidth - 100 });
      
      y += 45;

      // ===== ITEMS TABLE =====
      // Header
      doc.rect(40, y, pageWidth - 80, 25).fill(primaryColor);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      
      doc.text('#', 50, y + 8);
      doc.text('ITEM DESCRIPTION', 80, y + 8);
      doc.text('QTY', 350, y + 8);
      doc.text('UNIT PRICE', 410, y + 8);
      doc.text('SUBTOTAL', 480, y + 8);
      
      y += 25;

      // Rows
      doc.font('Helvetica').fontSize(9).fillColor('#1e293b');
      (items || []).forEach((item, i) => {
        if (i % 2 === 0) doc.rect(40, y, pageWidth - 80, 20).fill(lightGray);
        const sub = (item.quantity || 0) * (item.estimatedPrice || item.unitPrice || 0);
        
        doc.fillColor(primaryColor).font('Helvetica-Bold').text(String(i + 1), 50, y + 6);
        doc.fillColor('#1e293b').font('Helvetica').text((item.itemName || item.name || '').substring(0, 50), 80, y + 6);
        doc.text(String(item.quantity || 0) + ' ' + (item.unit || 'pcs'), 350, y + 6);
        doc.text('TSh ' + Number(item.estimatedPrice || item.unitPrice || 0).toLocaleString(), 410, y + 6);
        doc.text('TSh ' + Number(sub).toLocaleString(), 480, y + 6);
        y += 20;
      });

      y += 10;

      // Total Amount
      doc.moveTo(40, y).lineTo(pageWidth - 40, y).lineWidth(1).strokeColor(primaryColor).stroke();
      y += 10;
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('TOTAL APPROVED AMOUNT', 40, y);
      doc.fontSize(16).text('TSh ' + Number(totalAmount).toLocaleString(), pageWidth - 240, y - 2, { width: 200, align: 'right' });
      
      y += 25;

      // ===== CEO APPROVAL =====
      doc.roundedRect(40, y, pageWidth - 80, 35, 4).fillAndStroke('#f0fdf4', '#bbf7d0'); // Light green bg
      
      // Check icon
      doc.circle(55, y + 17.5, 8).fill('#16a34a');
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('✓', 51, y + 13);
      
      doc.fillColor('#166534').fontSize(10).font('Helvetica-Bold').text('Approved by: ' + (approvedByCeo || '—') + ', Chief Executive Officer', 75, y + 12);

      // QR Code
      if (qrCodeData) {
        try {
          const qrBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
          doc.image(qrBuffer, pageWidth - 100, y + 5, { width: 25, height: 25 });
        } catch (e) { console.error('QR error:', e); }
      }

      y += 50;

      // ===== TERMS & CONDITIONS =====
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('TERMS AND CONDITIONS OF USE', 40, y);
      y += 15;

      doc.roundedRect(40, y, pageWidth - 80, 90, 4).fillAndStroke(lightGray, borderColor);
      
      const terms = [
        '1. No procurement shall be carried out without this valid permit.',
        '2. This permit is valid for thirty (30) days from the date of issue.',
        '3. The approved amount may not be exceeded without a new authorization.',
        '4. The Procurement Officer must complete the procurement section before any payment.',
        '5. Finance shall not release payment without procurement confirmation and a valid invoice.',
        '6. This permit is non-transferable to any other person or department.',
        '7. A copy of this permit must be retained in the company records.'
      ];
      
      let termY = y + 10;
      doc.fontSize(8).font('Helvetica').fillColor('#334155');
      terms.forEach(term => {
        doc.text(term, 50, termY, { width: pageWidth - 100 });
        termY += 11;
      });

      y += 100;

      // Warning
      doc.rect(40, y, 4, 25).fill('#dc2626');
      doc.fillColor('#991b1b').fontSize(8).font('Helvetica-Bold')
         .text('WARNING: Any procurement carried out without this valid permit shall be deemed null and void, and its costs shall not be reimbursed by the company. Any person who violates these terms shall be held liable in accordance with company regulations.', 50, y + 4, { width: pageWidth - 100 });

      y += 40;

      // ===== PROCUREMENT & FINANCE DETAILS =====
      const halfWidth = (pageWidth - 80) / 2 - 10;
      
      // PROCUREMENT DETAILS
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('PROCUREMENT DETAILS', 40, y);
      doc.moveTo(40, y + 12).lineTo(40 + halfWidth, y + 12).lineWidth(1).strokeColor(goldColor).stroke();
      
      let procY = y + 20;
      const procFields = ['Supplier', 'Contact', 'Invoice No.', 'Actual Total', 'Delivery Date'];
      
      doc.fontSize(8).font('Helvetica');
      procFields.forEach(field => {
        doc.fillColor(grayColor).font('Helvetica-Bold').text(field, 40, procY);
        doc.moveTo(110, procY + 8).lineTo(40 + halfWidth, procY + 8).strokeColor(borderColor).lineWidth(0.5).stroke();
        procY += 16;
      });

      // FINANCE VERIFICATION
      const rightX = 40 + halfWidth + 20;
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('FINANCE VERIFICATION', rightX, y);
      doc.moveTo(rightX, y + 12).lineTo(rightX + halfWidth, y + 12).lineWidth(1).strokeColor(goldColor).stroke();
      
      let finY = y + 20;
      const finFields = ['Verified By', 'Verified Date', 'Payment Ref', 'Paid Date', 'Amount Paid'];
      
      doc.fontSize(8).font('Helvetica');
      finFields.forEach(field => {
        doc.fillColor(grayColor).font('Helvetica-Bold').text(field, rightX, finY);
        doc.moveTo(rightX + 70, finY + 8).lineTo(rightX + halfWidth, finY + 8).strokeColor(borderColor).lineWidth(0.5).stroke();
        finY += 16;
      });

      // ===== FOOTER =====
      const footerY = pageHeight - 45;
      doc.rect(0, footerY, pageWidth, 45).fill(primaryColor);
      
      doc.fillColor('white').fontSize(7).font('Helvetica')
         .text('Computer-generated document — valid without handwritten signature.', 0, footerY + 10, { width: pageWidth, align: 'center' });
      doc.fillColor(goldColor).fontSize(8).font('Helvetica-Bold')
         .text('info@makdc.co.tz  •  +255 754 123 456  •  www.makdc.co.tz', 0, footerY + 22, { width: pageWidth, align: 'center' });

      doc.end();
      stream.on('finish', () => resolve({ filename, filePath }));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ================================================================
// 3. GENERATE QR CODE
// ================================================================
async function generateQRCode(text) {
  try {
    return await QRCode.toDataURL(text, { width: 200, margin: 1 });
  } catch (err) {
    console.error('QR generation error:', err);
    return null;
  }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
  generateImprestNumber, // Imewekwa hapa
  generatePermitPDF,     // Jina limerekebishwa ili liendane na function hapo juu
  generateImprestPDF: generatePermitPDF, // Alias (Kama controller inaita jina la zamani, isifeli)
  generateQRCode,
};