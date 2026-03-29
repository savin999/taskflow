import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController';
import { verifyJWT } from '../middleware/verifyJWT';
import { authorize } from '../middleware/authorize';

const router = Router();

// ─── Task Routes ──────────────────────────────────────────────────────────────
// Pattern: verifyJWT → authorize('permission') → controller

// GET /tasks — everyone can read
router.get(
  '/',
  verifyJWT,
  authorize('tasks:read'),
  getTasks
);

// GET /tasks/:id — everyone can read
router.get(
  '/:id',
  verifyJWT,
  authorize('tasks:read'),
  getTaskById
);

// POST /tasks — manager and member only
router.post(
  '/',
  verifyJWT,
  authorize('tasks:create'),
  createTask
);

// PATCH /tasks/:id — manager and member
// member: only if createdBy === userId OR assignee === userId
router.patch(
  '/:id',
  verifyJWT,
  authorize('tasks:update', { ownerOnly: true }),
  updateTask
);

// DELETE /tasks/:id — manager and member
// member: only if createdBy === userId
router.delete(
  '/:id',
  verifyJWT,
  authorize('tasks:delete', { creatorOnly: true }),
  deleteTask
);

export default router;