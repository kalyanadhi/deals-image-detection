const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../lib/prisma');
const authenticate = require('../middleware/authenticate');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

const investmentSchema = z.object({
  name: z.string().min(1),
  ticker: z.string().max(20).transform(v => v.toUpperCase()).optional(),
  type: z.enum(['stock', 'crypto', 'etf', 'mutual_fund', 'bond', 'real_estate', 'other']),
  quantity: z.number().positive(),
  purchasePrice: z.number().positive(),
  currentPrice: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = investmentSchema.partial();

const priceSchema = z.object({
  currentPrice: z.number().positive(),
});

router.use(authenticate);

// GET /summary — must be declared before /:id routes
router.get('/summary', wrap(async (req, res) => {
  const userId = req.user.sub;

  const investments = await prisma.investment.findMany({ where: { userId } });

  let totalInvested = 0;
  let currentValue = 0;

  for (const inv of investments) {
    const qty = parseFloat(inv.quantity);
    totalInvested += parseFloat(inv.purchasePrice) * qty;
    currentValue += parseFloat(inv.currentPrice) * qty;
  }

  const gain = currentValue - totalInvested;
  const gainPercent = totalInvested === 0 ? 0 : (gain / totalInvested) * 100;

  res.json({
    success: true,
    data: { totalInvested, currentValue, gain, gainPercent },
  });
}));

// GET /
router.get('/', wrap(async (req, res) => {
  const userId = req.user.sub;

  const investments = await prisma.investment.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  // Sort by currentPrice * quantity desc in application layer (Prisma can't sort by computed value)
  investments.sort((a, b) => {
    const aVal = parseFloat(a.currentPrice) * parseFloat(a.quantity);
    const bVal = parseFloat(b.currentPrice) * parseFloat(b.quantity);
    return bVal - aVal;
  });

  res.json({ success: true, data: investments });
}));

// POST /
router.post('/', wrap(async (req, res) => {
  const userId = req.user.sub;
  const parsed = investmentSchema.parse(req.body);

  const { currentPrice, purchaseDate, ...rest } = parsed;

  const investment = await prisma.investment.create({
    data: {
      userId,
      ...rest,
      currentPrice: currentPrice ?? parsed.purchasePrice,
      ...(purchaseDate ? { purchaseDate: new Date(purchaseDate) } : {}),
    },
  });

  res.status(201).json({ success: true, data: investment });
}));

// PATCH /:id
router.patch('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  const existing = await prisma.investment.findFirst({ where: { id, userId } });
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Investment not found' });
  }

  const parsed = updateSchema.parse(req.body);
  const { purchaseDate, ...rest } = parsed;

  const investment = await prisma.investment.update({
    where: { id },
    data: {
      ...rest,
      ...(purchaseDate !== undefined ? { purchaseDate: new Date(purchaseDate) } : {}),
    },
  });

  res.json({ success: true, data: investment });
}));

// PATCH /:id/price
router.patch('/:id/price', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  const existing = await prisma.investment.findFirst({ where: { id, userId } });
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Investment not found' });
  }

  const { currentPrice } = priceSchema.parse(req.body);

  const investment = await prisma.investment.update({
    where: { id },
    data: { currentPrice },
  });

  res.json({ success: true, data: investment });
}));

// DELETE /:id
router.delete('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  const existing = await prisma.investment.findFirst({ where: { id, userId } });
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Investment not found' });
  }

  await prisma.investment.delete({ where: { id } });

  res.json({ success: true });
}));

module.exports = router;
