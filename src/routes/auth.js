const express = require('express');
const axios = require('axios');
const router = express.Router();
const prisma = require('../lib/prisma');

const CLIENT_ID = process.env.LINE_LOGIN_CHANNEL_ID;
const CLIENT_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;
const REDIRECT_URI = process.env.LINE_LOGIN_REDIRECT_URI;

// GET /auth/line — redirect ไป LINE Login
router.get('/line', (req, res) => {
  const url = new URL('https://access.line.me/oauth2/v2.1/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', 'profile openid');
  url.searchParams.set('state', 'splitbill');
  res.redirect(url.toString());
});

// GET /auth/callback — LINE redirect กลับมา
router.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  console.log('callback query:', req.query);

  if (error) {
    return res.status(400).json({ error, error_description });
  }

  if (!code) {
    return res.status(400).json({ error: 'no code' });
  }

  // แลก code เป็น token
  const tokenRes = await axios.post(
    'https://api.line.me/oauth2/v2.1/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  console.log('token response:', tokenRes.data);
  const { access_token } = tokenRes.data;

  // ดึง profile
  const profileRes = await axios.get('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const { userId, displayName } = profileRes.data;

  // upsert user
  await prisma.user.upsert({
    where: { line_user_id: userId },
    update: { display_name: displayName },
    create: { line_user_id: userId, display_name: displayName },
  });

  // redirect ไป frontend พร้อม token
  const webUrl = process.env.WEB_URL || 'http://localhost:5173';
  res.redirect(`${webUrl}?token=${access_token}&userId=${userId}&name=${encodeURIComponent(displayName)}`);
});

module.exports = router;
