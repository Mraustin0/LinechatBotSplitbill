const prisma = require('../lib/prisma');

// /setpromptpay 0812345678
async function handleSetPromptpay(event, client) {
  const { replyToken, source, message } = event;
  const parts = message.text.trim().split(/\s+/);

  if (parts.length < 2) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: 'รูปแบบ: /setpromptpay [เบอร์มือถือหรือเลขบัตรประชาชน]',
    });
  }

  const number = parts[1];
  const userId = source.userId;

  await prisma.user.upsert({
    where: { line_user_id: userId },
    update: { promptpay_number: number },
    create: { line_user_id: userId, display_name: userId, promptpay_number: number },
  });

  return client.replyMessage(replyToken, {
    type: 'text',
    text: `✅ ตั้ง PromptPay เป็น ${number} แล้ว`,
  });
}

module.exports = { handleSetPromptpay };
