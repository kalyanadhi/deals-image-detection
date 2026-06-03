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

const walletSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  currency: z.string().length(3).default('USD'),
  color: z.string().optional(),
  icon: z.string().optional(),
});

router.use(authenticate);

// GET / — all wallets where user is owner or member
router.get('/', wrap(async (req, res) => {
  const userId = req.user.sub;
  const wallets = await prisma.wallet.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  const data = wallets.map(({ _count, ...w }) => ({
    ...w,
    memberCount: _count.members,
    balance: 0,
  }));

  res.json({ success: true, data });
}));

// POST / — create wallet
router.post('/', wrap(async (req, res) => {
  const userId = req.user.sub;
  const parsed = walletSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const wallet = await prisma.wallet.create({
    data: { ...parsed.data, ownerId: userId },
  });

  res.status(201).json({ success: true, data: wallet });
}));

// GET /:id — wallet with full members
router.get('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  await assertWalletAccess(req.params.id, userId);

  const wallet = await prisma.wallet.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  res.json({ success: true, data: wallet });
}));

// PATCH /:id — update wallet (owner only)
router.patch('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  const wallet = await assertWalletAccess(req.params.id, userId);
  if (wallet.ownerId !== userId) {
    return res.status(403).json({ success: false, error: 'Only the owner can update this wallet' });
  }

  const parsed = walletSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const updated = await prisma.wallet.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json({ success: true, data: updated });
}));

// DELETE /:id — delete wallet (owner only)
router.delete('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  const wallet = await assertWalletAccess(req.params.id, userId);
  if (wallet.ownerId !== userId) {
    return res.status(403).json({ success: false, error: 'Only the owner can delete this wallet' });
  }

  await prisma.wallet.delete({ where: { id: req.params.id } });

  res.json({ success: true });
}));

// POST /:id/members — add member (owner only)
router.post('/:id/members', wrap(async (req, res) => {
  const userId = req.user.sub;
  const wallet = await assertWalletAccess(req.params.id, userId);
  if (wallet.ownerId !== userId) {
    return res.status(403).json({ success: false, error: 'Only the owner can add members' });
  }

  const parsed = z.object({
    email: z.string().email(),
    role: z.enum(['editor', 'viewer']),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const { email, role } = parsed.data;

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });
  if (targetUser.id === userId) return res.status(400).json({ success: false, error: 'Cannot add yourself as a member' });

  const existing = await prisma.walletMember.findFirst({
    where: { walletId: req.params.id, userId: targetUser.id },
  });
  if (existing) return res.status(409).json({ success: false, error: 'User is already a member' });

  await prisma.walletMember.create({
    data: {
      walletId: req.params.id,
      userId: targetUser.id,
      role,
      invitedBy: userId,
    },
  });

  const members = await prisma.walletMember.findMany({
    where: { walletId: req.params.id },
    include: { user: { select: { name: true, email: true } } },
  });

  res.status(201).json({ success: true, data: members });
}));

// PATCH /:id/members/:memberId — update member role (owner only)
router.patch('/:id/members/:memberId', wrap(async (req, res) => {
  const userId = req.user.sub;
  const wallet = await assertWalletAccess(req.params.id, userId);
  if (wallet.ownerId !== userId) {
    return res.status(403).json({ success: false, error: 'Only the owner can update member roles' });
  }

  const parsed = z.object({ role: z.enum(['editor', 'viewer']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const updated = await prisma.walletMember.update({
    where: { id: req.params.memberId },
    data: { role: parsed.data.role },
    include: { user: { select: { name: true, email: true } } },
  });

  res.json({ success: true, data: updated });
}));

// DELETE /:id/members/:memberId — remove member (owner only)
router.delete('/:id/members/:memberId', wrap(async (req, res) => {
  const userId = req.user.sub;
  const wallet = await assertWalletAccess(req.params.id, userId);
  if (wallet.ownerId !== userId) {
    return res.status(403).json({ success: false, error: 'Only the owner can remove members' });
  }

  await prisma.walletMember.delete({ where: { id: req.params.memberId } });

  res.json({ success: true });
}));

module.exports = router;
