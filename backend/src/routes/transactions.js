const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../lib/prisma');
const authenticate = require('../middleware/authenticate');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

async function assertWalletAccess(walletId, userId, requireEditor = false) {
  const wallet = await prisma.wallet.findFirst({
    where: {
      id: walletId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, ...(requireEditor ? { role: 'editor' } : {}) } } },
      ],
    },
  });
  if (!wallet) throw Object.assign(new Error('Wallet not found or access denied'), { status: 404 });
  return wallet;
}

router.use(authenticate);

// GET /wallets/:walletId/transactions
router.get('/wallets/:walletId/transactions', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { walletId } = req.params;
  await assertWalletAccess(walletId, userId);

  const { type, from, to, categoryId } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const where = { walletId };
  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      data: transactions,
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
}));

// POST /wallets/:walletId/transactions
router.post('/wallets/:walletId/transactions', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { walletId } = req.params;
  await assertWalletAccess(walletId, userId, true);

  const parsed = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(),
    categoryId: z.string().uuid().optional(),
    description: z.string().optional(),
    date: z.string(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const transaction = await prisma.transaction.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      walletId,
      createdBy: userId,
    },
    include: {
      category: { select: { id: true, name: true, icon: true } },
    },
  });

  res.status(201).json({ success: true, data: transaction });
}));

// DELETE /wallets/:walletId/transactions/:id
router.delete('/wallets/:walletId/transactions/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { walletId, id } = req.params;
  await assertWalletAccess(walletId, userId, true);

  const transaction = await prisma.transaction.findFirst({
    where: { id, walletId },
  });
  if (!transaction) return res.status(404).json({ success: false, error: 'Transaction not found' });

  await prisma.transaction.delete({ where: { id } });

  res.json({ success: true });
}));

// GET /wallets/:walletId/balance
router.get('/wallets/:walletId/balance', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { walletId } = req.params;
  await assertWalletAccess(walletId, userId);

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({ where: { walletId, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { walletId, type: 'expense' }, _sum: { amount: true } }),
  ]);
  const inc = parseFloat(income._sum.amount || 0);
  const exp = parseFloat(expense._sum.amount || 0);

  res.json({ success: true, data: { balance: inc - exp, income: inc, expense: exp } });
}));

module.exports = router;
