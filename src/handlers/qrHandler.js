const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');

// สร้าง QR buffer สำหรับ PromptPay
async function generateQRBuffer(promptpayNumber, amount) {
  const payload = generatePayload(promptpayNumber, { amount });
  const buffer = await QRCode.toBuffer(payload, { type: 'png', width: 400 });
  return buffer;
}

module.exports = { generateQRBuffer };
