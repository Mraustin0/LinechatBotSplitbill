const express = require('express');
const axios = require('axios');
const router = express.Router();
const prisma = require('../lib/prisma');

// middleware ตรวจ LINE token
async function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data } = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    req.userId = data.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/me — ข้อมูล user + PromptPay
router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { line_user_id: req.userId } });
  res.json(user);
});

// PATCH /api/me/promptpay — อัพเดท PromptPay
router.patch('/me/promptpay', auth, async (req, res) => {
  const { promptpay_number } = req.body;
  const user = await prisma.user.update({
    where: { line_user_id: req.userId },
    data: { promptpay_number },
  });
  res.json(user);
});

// GET /api/bills — bill history ของ user นี้
router.get('/bills', auth, async (req, res) => {
  const shares = await prisma.share.findMany({
    where: { user_id: req.userId },
    include: {
      bill: {
        include: {
          shares: { include: { user: true } },
          group: true,
        },
      },
    },
    orderBy: { bill: { created_at: 'desc' } },
  });

  const bills = shares.map((s) => ({
    id: s.bill.id,
    title: s.bill.title,
    total: s.bill.total,
    status: s.bill.status,
    group: s.bill.group.name,
    myAmount: s.amount,
    paid: s.paid,
    createdAt: s.bill.created_at,
    members: s.bill.shares.map((m) => ({
      name: m.user.display_name,
      amount: m.amount,
      paid: m.paid,
    })),
  }));

  res.json(bills);
});

// GET /api/summary — ยอดรวม paid/unpaid + monthly spending
router.get('/summary', auth, async (req, res) => {
  const shares = await prisma.share.findMany({
    where: { user_id: req.userId },
    include: { bill: true },
  });

  const totalPaid = shares.filter((s) => s.paid).reduce((sum, s) => sum + s.amount, 0);
  const totalUnpaid = shares.filter((s) => !s.paid).reduce((sum, s) => sum + s.amount, 0);

  // monthly spending ย้อนหลัง 6 เดือน
  const monthly = {};
  shares.forEach((s) => {
    const d = new Date(s.bill.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + s.amount;
  });

  const chart = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount }));

  res.json({ totalPaid, totalUnpaid, chart });
});

module.exports = router;
