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

const createSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  period: z.enum(['weekly', 'monthly', 'yearly']),
});

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  period: z.enum(['weekly', 'monthly', 'yearly']).optional(),
});

router.use(authenticate);

// GET /wallets/:walletId/budgets
router.get('/wallets/:walletId/budgets', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { walletId } = req.params;

  await assertWalletAccess(walletId, userId);

  const budgets = await prisma.budget.findMany({
    where: { walletId },
    include: {
      category: { select: { id: true, name: true, icon: true } },
    },
  });

  res.json({ success: true, data: budgets });
}));

// POST /wallets/:walletId/budgets
router.post('/wallets/:walletId/budgets', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { walletId } = req.params;

  await assertWalletAccess(walletId, userId, true);

  const { categoryId, amount, period } = createSchema.parse(req.body);

  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) {
    return res.status(404).json({ success: false, error: 'Category not found' });
  }

  const budget = await prisma.budget.create({
    data: {
      walletId,
      categoryId,
      amount,
      period,
      createdBy: userId,
    },
    include: {
      category: { select: { id: true, name: true, icon: true } },
    },
  });

  res.status(201).json({ success: true, data: budget });
}));

// PATCH /wallets/:walletId/budgets/:id
router.patch('/wallets/:walletId/budgets/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { walletId, id } = req.params;

  await assertWalletAccess(walletId, userId, true);

  const updates = updateSchema.parse(req.body);

  const budget = await prisma.budget.update({
    where: { id },
    data: updates,
    include: {
      category: { select: { id: true, name: true, icon: true } },
    },
  });

  res.json({ success: true, data: budget });
}));

// DELETE /wallets/:walletId/budgets/:id
router.delete('/wallets/:walletId/budgets/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { walletId, id } = req.params;

  await assertWalletAccess(walletId, userId, true);

  await prisma.budget.delete({ where: { id } });

  res.json({ success: true });
}));

module.exports = router;
