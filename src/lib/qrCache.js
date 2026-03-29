const { randomUUID } = require('crypto');
const { generateQRBuffer } = require('../handlers/qrHandler');

const cache = new Map();

async function storeQR(number, amount) {
  const id = randomUUID();
  const buffer = await generateQRBuffer(number, amount);
  cache.set(id, buffer);
  setTimeout(() => cache.delete(id), 10 * 60 * 1000); // ลบหลัง 10 นาที
  return `${process.env.BASE_URL}/qr/${id}.png`;
}

function getQR(id) {
  return cache.get(id);
}

module.exports = { storeQR, getQR };
