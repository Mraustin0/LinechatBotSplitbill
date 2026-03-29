require('dotenv').config();
const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const { handleSetPromptpay } = require('./handlers/userHandler');
const { handleSplitCollect, handleItem, handleDone, handleStatus, handlePaid } = require('./handlers/billHandler');
const cors = require('cors');
const { getQR } = require('./lib/qrCache');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:5173' }));
app.use(express.json());

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(lineConfig);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'SplitBill LINE Bot is running' });
});

app.use('/auth', authRouter);
app.use('/api', apiRouter);

// QR image endpoint
app.get('/qr/:id.png', (req, res) => {
  const buffer = getQR(req.params.id);
  if (!buffer) return res.status(404).send('not found');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
});

app.post('/webhook', middleware(lineConfig), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('LINE error:', err?.response?.data || err.message);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  // postback จากปุ่ม Flex
  if (event.type === 'postback') {
    const params = new URLSearchParams(event.postback.data);
    if (params.get('action') === 'paid') return handlePaid(event, client);
    return;
  }

  if (event.type !== 'message' || event.message.type !== 'text') return;

  const raw = event.message.text.trim();
  // normalize: ตัด / ออกถ้ามี แล้วเปรียบเทียบ lowercase
  const text = raw.startsWith('/') ? raw.slice(1) : raw;
  const cmd = text.split(/\s+/)[0].toLowerCase();
  console.log(`[${event.source.type}] ${event.source.userId}: ${raw}`);

  // inject normalized text กลับไปใน event เพื่อให้ handler parse ได้ถูก
  event.message.text = text;

  if (cmd === 'split')        return handleSplitCollect(event, client);
  if (cmd === 'item')         return handleItem(event, client);
  if (cmd === 'done')         return handleDone(event, client);
  if (cmd === 'status')       return handleStatus(event, client);
  if (cmd === 'setpromptpay') return handleSetPromptpay(event, client);
  if (cmd === 'help')         return handleHelp(event, client);
}

async function handleHelp(event, client) {
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '🤖 SplitBill Commands\n─────────────────\n💬 split [ยอด] [ชื่อ] — เปิดบิล\n🍽 item [ชื่อ] [ราคา] — เพิ่มรายการ\n✅ done — ปิดบิล + ส่ง QR\n📊 status — ดูสถานะบิล\n📱 setpromptpay [เบอร์] — ตั้ง PromptPay\n─────────────────\nพิมพ์ได้ทั้ง "split" หรือ "/split"',
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook: http://localhost:${PORT}/webhook`);
});
