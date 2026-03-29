const prisma = require('../lib/prisma');
const { storeQR } = require('../lib/qrCache');
const { upsertUser } = require('../lib/lineProfile');
const { billSummaryFlex } = require('./flexHandler');

// หา active bill ในกลุ่ม
async function getActiveBill(groupId) {
  const group = await prisma.group.findUnique({ where: { line_group_id: groupId } });
  if (!group) return null;
  return prisma.bill.findFirst({
    where: { group_id: group.id, status: 'collecting' },
    include: { items: true, shares: { include: { user: true } } },
    orderBy: { created_at: 'desc' },
  });
}

// /split [total] [title]
async function handleSplitCollect(event, client) {
  const { replyToken, source, message } = event;
  const parts = message.text.trim().split(/\s+/);

  if (parts.length < 3) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: 'รูปแบบ: split [ยอดรวม] [ชื่อบิล]\nเช่น split 850 อาหารเย็น',
    });
  }

  const total = parseFloat(parts[1]);
  const title = parts.slice(2).join(' ');
  const groupId = source.groupId || source.userId;
  const userId = source.userId;

  if (isNaN(total)) {
    return client.replyMessage(replyToken, { type: 'text', text: 'ยอดเงินไม่ถูกต้อง' });
  }

  const group = await prisma.group.upsert({
    where: { line_group_id: groupId },
    update: {},
    create: { line_group_id: groupId, name: 'Group' },
  });

  await prisma.bill.updateMany({
    where: { group_id: group.id, status: 'collecting' },
    data: { status: 'cancelled' },
  });

  await upsertUser(client, userId, source);

  const bill = await prisma.bill.create({
    data: { group_id: group.id, title, total, created_by: userId, status: 'collecting' },
  });

  return client.replyMessage(replyToken, {
    type: 'text',
    text: `📋 เปิดบิล: ${title}\n💰 ยอดรวม: ${total} บาท\n\nแต่ละคนพิมพ์:\n/item [ชื่ออาหาร] [ราคา]\n\nพิมพ์ /done เมื่อครบทุกคน`,
  });
}

// /item [ชื่อ] [ราคา]
async function handleItem(event, client) {
  const { replyToken, source, message } = event;
  const parts = message.text.trim().split(/\s+/);

  if (parts.length < 3) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: 'รูปแบบ: /item [ชื่ออาหาร] [ราคา]\nเช่น /item ข้าวมันไก่ 60',
    });
  }

  const groupId = source.groupId || source.userId;
  const userId = source.userId;
  const price = parseFloat(parts[parts.length - 1]);
  const itemName = parts.slice(1, parts.length - 1).join(' ');

  if (isNaN(price)) {
    return client.replyMessage(replyToken, { type: 'text', text: 'ราคาไม่ถูกต้อง' });
  }

  const bill = await getActiveBill(groupId);
  if (!bill) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: 'ไม่มีบิลที่เปิดอยู่ ใช้ /split เพื่อเปิดบิลก่อน',
    });
  }

  await upsertUser(client, userId, source);

  await prisma.item.create({ data: { bill_id: bill.id, name: itemName, price } });

  const existingShare = await prisma.share.findFirst({
    where: { bill_id: bill.id, user_id: userId },
  });

  if (existingShare) {
    await prisma.share.update({
      where: { id: existingShare.id },
      data: { amount: existingShare.amount + price },
    });
  } else {
    await prisma.share.create({
      data: { bill_id: bill.id, user_id: userId, amount: price },
    });
  }

  return client.replyMessage(replyToken, {
    type: 'text',
    text: `✅ ${itemName} ${price} บาท — บันทึกแล้ว`,
  });
}

// /done — ปิดบิล + ส่ง Flex + push QR ให้แต่ละคน
async function handleDone(event, client) {
  const { replyToken, source } = event;
  const groupId = source.groupId || source.userId;

  const bill = await getActiveBill(groupId);
  if (!bill) {
    return client.replyMessage(replyToken, { type: 'text', text: 'ไม่มีบิลที่เปิดอยู่' });
  }

  if (bill.shares.length === 0) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: 'ยังไม่มีใคร add item เลย ใช้ /item ก่อน',
    });
  }

  await prisma.bill.update({ where: { id: bill.id }, data: { status: 'done' } });

  // ส่ง Flex Message สรุปบิลพร้อมปุ่ม "ฉันจ่ายแล้ว"
  await client.replyMessage(replyToken, billSummaryFlex(bill, bill.shares));

  // Push QR ให้แต่ละคนใน DM
  for (const share of bill.shares) {
    const user = await prisma.user.findUnique({ where: { line_user_id: share.user_id } });
    if (!user?.promptpay_number) continue;

    const qrUrl = await storeQR(user.promptpay_number, share.amount);
    await client.pushMessage(share.user_id, [
      {
        type: 'text',
        text: `💳 บิล: ${bill.title}\nยอดของคุณ: ${share.amount} บาท\nPromptPay: ${user.promptpay_number}`,
      },
      { type: 'image', originalContentUrl: qrUrl, previewImageUrl: qrUrl },
    ]);
  }
}

// /status — Flex Message สถานะบิล
async function handleStatus(event, client) {
  const { replyToken, source } = event;
  const groupId = source.groupId || source.userId;

  const bill = await getActiveBill(groupId);
  if (!bill) {
    return client.replyMessage(replyToken, { type: 'text', text: 'ไม่มีบิลที่เปิดอยู่' });
  }

  return client.replyMessage(replyToken, billSummaryFlex(bill, bill.shares));
}

// postback: action=paid&bill_id=X
async function handlePaid(event, client) {
  const { replyToken, source } = event;
  const params = new URLSearchParams(event.postback.data);
  const billId = parseInt(params.get('bill_id'));
  const userId = source.userId;

  const share = await prisma.share.findFirst({
    where: { bill_id: billId, user_id: userId },
  });

  if (!share) {
    return client.replyMessage(replyToken, { type: 'text', text: 'ไม่พบข้อมูลของคุณในบิลนี้' });
  }

  if (share.paid) {
    return client.replyMessage(replyToken, { type: 'text', text: 'คุณได้แจ้งจ่ายแล้ว ✅' });
  }

  await prisma.share.update({ where: { id: share.id }, data: { paid: true } });

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { shares: { include: { user: true } } },
  });

  const user = await prisma.user.findUnique({ where: { line_user_id: userId } });

  await client.replyMessage(replyToken, {
    type: 'text',
    text: `✅ ${user.display_name} แจ้งจ่าย ${share.amount} บาท แล้ว`,
  });

  // notify creator
  if (bill.created_by !== userId) {
    const paidCount = bill.shares.filter((s) => s.paid || s.user_id === userId).length;
    const total = bill.shares.length;
    await client.pushMessage(bill.created_by, {
      type: 'text',
      text: `💰 ${user.display_name} จ่ายแล้ว ${share.amount} บาท\n[${bill.title}] ${paidCount}/${total} คน`,
    });
  }
}

module.exports = { handleSplitCollect, handleItem, handleDone, handleStatus, handlePaid };
