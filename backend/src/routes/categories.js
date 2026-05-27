const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../lib/prisma');
const authenticate = require('../middleware/authenticate');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

const DEFAULT_CATEGORIES = [
  { name: 'Salary💵',        type: 'income',  icon: '💵', isDefault: true },
  { name: 'Freelance💻',     type: 'income',  icon: '💻', isDefault: true },
  { name: 'Investment📈',    type: 'income',  icon: '📈', isDefault: true },
  { name: 'Gift🎁',          type: 'income',  icon: '🎁', isDefault: true },
  { name: 'Refund↩️',        type: 'income',  icon: '↩️', isDefault: true },
  { name: 'Other Income💰',  type: 'income',  icon: '💰', isDefault: true },
  { name: 'Food & Dining🍔', type: 'expense', icon: '🍔', isDefault: true },
  { name: 'Shopping🛍️',      type: 'expense', icon: '🛍️', isDefault: true },
  { name: 'Transport🚗',     type: 'expense', icon: '🚗', isDefault: true },
  { name: 'Housing🏠',       type: 'expense', icon: '🏠', isDefault: true },
  { name: 'Entertainment🎬', type: 'expense', icon: '🎬', isDefault: true },
  { name: 'Health💊',        type: 'expense', icon: '💊', isDefault: true },
  { name: 'Education📚',     type: 'expense', icon: '📚', isDefault: true },
  { name: 'Travel✈️',        type: 'expense', icon: '✈️', isDefault: true },
  { name: 'Bills📄',         type: 'expense', icon: '📄', isDefault: true },
  { name: 'Other📦',         type: 'expense', icon: '📦', isDefault: true },
];

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  icon: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['income', 'expense']).optional(),
  icon: z.string().optional(),
});

router.use(authenticate);

// GET /
router.get('/', wrap(async (req, res) => {
  const userId = req.user.sub;

  const count = await prisma.category.count({ where: { userId } });

  if (count === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId })),
    });
  }

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  res.json({ success: true, data: categories });
}));

// POST /
router.post('/', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { name, type, icon } = createSchema.parse(req.body);

  const category = await prisma.category.create({
    data: { userId, name, type, ...(icon !== undefined && { icon }) },
  });

  res.status(201).json({ success: true, data: category });
}));

// PATCH /:id
router.patch('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;
  const updates = updateSchema.parse(req.body);

  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Category not found' });
  }

  const category = await prisma.category.update({
    where: { id },
    data: updates,
  });

  res.json({ success: true, data: category });
}));

// DELETE /:id
router.delete('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  const { id } = req.params;

  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Category not found' });
  }

  await prisma.category.delete({ where: { id } });

  res.json({ success: true });
}));

module.exports = router;
