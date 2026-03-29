import { Response, NextFunction } from 'express';
import { AuthRequest } from './verifyJWT';
import Task from '../models/Task';

// ─── Permission Map ───────────────────────────────────────────────────────────
// This defines which roles are allowed for each permission.
// Roles are loaded from the JWT — not hardcoded in route files.
const permissionMap: Record<string, string[]> = {
  'tasks:read':         ['manager', 'member', 'viewer'],
  'tasks:create':       ['manager', 'member'],
  'tasks:update':       ['manager', 'member'],
  'tasks:delete':       ['manager', 'member'],
  'users:updateRole':   ['manager'],
};

// ─── authorize() ─────────────────────────────────────────────────────────────
// Usage:  authorize('tasks:create')
//         authorize('tasks:update', { ownerOnly: true })
//
// ownerOnly: true means Members can only act on tasks they created or
// are assigned to. Managers bypass this check entirely.

export const authorize = (
  permission: string,
  options: { ownerOnly?: boolean; creatorOnly?: boolean } = {}
) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;

      // 1. Must be authenticated
      if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // 2. Check role has permission
      const allowedRoles = permissionMap[permission];
      if (!allowedRoles || !allowedRoles.includes(user.role)) {
        res.status(403).json({ message: 'Forbidden: insufficient role' });
        return;
      }

      // 3. ownerOnly check — only applies to Members
      //    Managers skip this block entirely (they can touch any task)
      if (options.ownerOnly && user.role === 'member') {
        const taskId = req.params.id;
        const task = await Task.findById(taskId);

        if (!task) {
          // Return 403 not 404 — never leak that a resource exists
          res.status(403).json({ message: 'Forbidden' });
          return;
        }

        const isCreator  = task.createdBy === user.userId;
        const isAssignee = task.assignee  === user.userId;

        if (!isCreator && !isAssignee) {
          res.status(403).json({ message: 'Forbidden: not your task' });
          return;
        }
      }

      // 4. creatorOnly check — for DELETE (Members can only delete tasks they created)
      if (options.creatorOnly && user.role === 'member') {
        const taskId = req.params.id;
        const task = await Task.findById(taskId);

        if (!task) {
          res.status(403).json({ message: 'Forbidden' });
          return;
        }

        const isCreator = task.createdBy === user.userId;

        if (!isCreator) {
          res.status(403).json({ message: 'Forbidden: not your task' });
          return;
        }
      }

      // 5. All checks passed — proceed to controller
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};
