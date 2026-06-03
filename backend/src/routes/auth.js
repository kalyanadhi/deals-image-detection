const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const authenticate = require('../middleware/authenticate');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

async function issueTokens(userId, email) {
  const accessToken = jwt.sign(
    { sub: userId, email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { sub: userId, email },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const logoutSchema = z.object({
  refreshToken: z.string(),
});

// POST /register
router.post('/register', wrap(async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ success: false, error: 'Email already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

  res.status(201).json({
    success: true,
    data: {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    },
  });
}));

// POST /login
router.post('/login', wrap(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

  res.json({
    success: true,
    data: {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    },
  });
}));

// POST /refresh
router.post('/refresh', wrap(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ success: false, error: 'Refresh token not found or expired' });
  }

  await prisma.refreshToken.delete({ where: { token: refreshToken } });

  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(payload.sub, payload.email);

  res.json({
    success: true,
    data: { accessToken, refreshToken: newRefreshToken },
  });
}));

// DELETE /logout
router.delete('/logout', wrap(async (req, res) => {
  const { refreshToken } = logoutSchema.parse(req.body);

  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });

  res.json({ success: true });
}));

// GET /me
router.get('/me', authenticate, wrap(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({ success: true, data: user });
}));

module.exports = router;
module.exports.issueTokens = issueTokens;
