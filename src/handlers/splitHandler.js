const prisma = require('../lib/prisma');
const { storeQR } = require('../lib/qrCache');

// /split 850 4  หรือ  /split 850 4 ข้าวมันไก่
async function handleSplit(event, client) {
  const { replyToken, source, message } = event;
  const text = message.text.trim();
  const parts = text.split(/\s+/);

  if (parts.length < 3) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: 'รูปแบบ: /split [ยอด] [จำนวนคน] [ชื่อ(optional)]\nเช่น /split 850 4 ข้าวมันไก่',
    });
  }

  const total = parseFloat(parts[1]);
  const people = parseInt(parts[2]);
  const title = parts.slice(3).join(' ') || 'บิลแชร์';

  if (isNaN(total) || isNaN(people) || people <= 0) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: 'ยอดเงินหรือจำนวนคนไม่ถูกต้อง',
    });
  }

  const perPerson = Math.ceil((total / people) * 100) / 100;
  const groupId = source.groupId || source.userId;
  const userId = source.userId;

  const group = await prisma.group.upsert({
    where: { line_group_id: groupId },
    update: {},
    create: { line_group_id: groupId, name: 'Group' },
  });

  await prisma.user.upsert({
    where: { line_user_id: userId },
    update: {},
    create: { line_user_id: userId, display_name: userId },
  });

  const bill = await prisma.bill.create({
    data: { group_id: group.id, title, total, created_by: userId },
  });

  const creator = await prisma.user.findUnique({ where: { line_user_id: userId } });
  const promptpayNumber = creator?.promptpay_number;

  const summaryText = `📋 ${title}\n💰 ยอดรวม: ${total} บาท\n👥 หาร ${people} คน\n💵 คนละ: ${perPerson} บาท\n[Bill #${bill.id}]`;

  if (!promptpayNumber) {
    return client.replyMessage(replyToken, [
      { type: 'text', text: summaryText },
      { type: 'text', text: 'ตั้ง PromptPay ก่อนได้ QR:\n/setpromptpay [เบอร์]' },
    ]);
  }

  const qrUrl = await storeQR(promptpayNumber, perPerson);

  return client.replyMessage(replyToken, [
    { type: 'text', text: summaryText },
    {
      type: 'image',
      originalContentUrl: qrUrl,
      previewImageUrl: qrUrl,
    },
  ]);
}

module.exports = { handleSplit };
