const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../lib/prisma');
const authenticate = require('../middleware/authenticate');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

async function assertSavingsOwnership(savingsAccountId, userId) {
  const account = await prisma.savingsAccount.findFirst({ where: { id: savingsAccountId, userId } });
  if (!account) throw Object.assign(new Error('Savings account not found or access denied'), { status: 404 });
  return account;
}

async function getBalance(savingsAccountId) {
  const [dep, wit] = await Promise.all([
    prisma.savingsTransaction.aggregate({ where: { savingsAccountId, type: 'deposit' }, _sum: { amount: true } }),
    prisma.savingsTransaction.aggregate({ where: { savingsAccountId, type: 'withdrawal' }, _sum: { amount: true } }),
  ]);
  return parseFloat(dep._sum.amount || 0) - parseFloat(wit._sum.amount || 0);
}

const savingsSchema = z.object({
  name: z.string().min(1),
  interestRate: z.number().min(0).max(100).default(0),
  compounding: z.enum(['monthly', 'quarterly', 'annually']).default('monthly'),
  currency: z.string().length(3).default('USD'),
  icon: z.string().optional(),
  color: z.string().optional(),
});

router.use(authenticate);

// GET / — all savings accounts for user
router.get('/', wrap(async (req, res) => {
  const userId = req.user.sub;

  const accounts = await prisma.savingsAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const data = await Promise.all(
    accounts.map(async (account) => ({
      ...account,
      balance: await getBalance(account.id),
    }))
  );

  res.json({ success: true, data });
}));

// POST / — create savings account
router.post('/', wrap(async (req, res) => {
  const userId = req.user.sub;
  const parsed = savingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const account = await prisma.savingsAccount.create({
    data: { ...parsed.data, userId },
  });

  res.status(201).json({ success: true, data: { ...account, balance: 0 } });
}));

// PATCH /:id — update savings account
router.patch('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  await assertSavingsOwnership(req.params.id, userId);

  const parsed = savingsSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const updated = await prisma.savingsAccount.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  const balance = await getBalance(req.params.id);
  res.json({ success: true, data: { ...updated, balance } });
}));

// DELETE /:id — delete savings account
router.delete('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  await assertSavingsOwnership(req.params.id, userId);

  await prisma.savingsAccount.delete({ where: { id: req.params.id } });

  res.json({ success: true });
}));

// GET /:id/transactions — list transactions
router.get('/:id/transactions', wrap(async (req, res) => {
  const userId = req.user.sub;
  await assertSavingsOwnership(req.params.id, userId);

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.savingsTransaction.findMany({
      where: { savingsAccountId: req.params.id },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.savingsTransaction.count({ where: { savingsAccountId: req.params.id } }),
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

// POST /:id/transactions — create transaction
router.post('/:id/transactions', wrap(async (req, res) => {
  const userId = req.user.sub;
  await assertSavingsOwnership(req.params.id, userId);

  const parsed = z.object({
    type: z.enum(['deposit', 'withdrawal']),
    amount: z.number().positive(),
    note: z.string().optional(),
    date: z.string(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const transaction = await prisma.savingsTransaction.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      savingsAccountId: req.params.id,
    },
  });

  const balance = await getBalance(req.params.id);
  res.status(201).json({ success: true, data: { transaction, balance } });
}));

module.exports = router;
