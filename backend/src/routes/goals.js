const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../lib/prisma');
const authenticate = require('../middleware/authenticate');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

async function assertGoalOwnership(goalId, userId) {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw Object.assign(new Error('Goal not found or access denied'), { status: 404 });
  return goal;
}

async function getGoalWithSaved(goalId) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { contributions: { select: { amount: true } } },
  });
  const savedAmount = goal.contributions.reduce((s, c) => s + parseFloat(c.amount), 0);
  const { contributions, ...rest } = goal;
  return { ...rest, savedAmount };
}

const goalSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  targetAmount: z.number().positive(),
  deadline: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

router.use(authenticate);

// GET / — all goals for user
router.get('/', wrap(async (req, res) => {
  const userId = req.user.sub;

  const goals = await prisma.goal.findMany({
    where: { userId },
    include: { contributions: { select: { amount: true } } },
    orderBy: { deadline: 'asc' },
  });

  const data = goals.map(({ contributions, ...g }) => ({
    ...g,
    savedAmount: contributions.reduce((s, c) => s + parseFloat(c.amount), 0),
  }));

  res.json({ success: true, data });
}));

// POST / — create goal
router.post('/', wrap(async (req, res) => {
  const userId = req.user.sub;
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const goal = await prisma.goal.create({
    data: {
      ...parsed.data,
      deadline: new Date(parsed.data.deadline),
      userId,
    },
  });

  res.status(201).json({ success: true, data: { ...goal, savedAmount: 0 } });
}));

// PATCH /:id — update goal
router.patch('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  await assertGoalOwnership(req.params.id, userId);

  const parsed = goalSchema.extend({
    status: z.enum(['active', 'completed', 'paused']).optional(),
  }).partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const updateData = { ...parsed.data };
  if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);

  await prisma.goal.update({ where: { id: req.params.id }, data: updateData });

  const updated = await getGoalWithSaved(req.params.id);
  res.json({ success: true, data: updated });
}));

// DELETE /:id — delete goal
router.delete('/:id', wrap(async (req, res) => {
  const userId = req.user.sub;
  await assertGoalOwnership(req.params.id, userId);

  await prisma.goal.delete({ where: { id: req.params.id } });

  res.json({ success: true });
}));

// POST /:id/contributions — add contribution
router.post('/:id/contributions', wrap(async (req, res) => {
  const userId = req.user.sub;
  const goal = await assertGoalOwnership(req.params.id, userId);

  const parsed = z.object({
    amount: z.number().positive(),
    note: z.string().optional(),
    date: z.string(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });

  const contribution = await prisma.goalContribution.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      goalId: req.params.id,
    },
  });

  // Check if goal is now complete
  const updatedGoal = await getGoalWithSaved(req.params.id);
  if (updatedGoal.savedAmount >= parseFloat(goal.targetAmount) && updatedGoal.status !== 'completed') {
    await prisma.goal.update({
      where: { id: req.params.id },
      data: { status: 'completed' },
    });
    updatedGoal.status = 'completed';
  }

  res.status(201).json({ success: true, data: { contribution, goal: updatedGoal } });
}));

// GET /:id/contributions — list contributions
router.get('/:id/contributions', wrap(async (req, res) => {
  const userId = req.user.sub;
  await assertGoalOwnership(req.params.id, userId);

  const contributions = await prisma.goalContribution.findMany({
    where: { goalId: req.params.id },
    orderBy: { date: 'desc' },
  });

  res.json({ success: true, data: contributions });
}));

module.exports = router;
