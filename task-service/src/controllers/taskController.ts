import { Response } from 'express';
import Task from '../models/Task';
import Activity from '../models/Activity';
import { AuthRequest } from '../middleware/verifyJWT';

// ─── Get All Tasks ────────────────────────────────────────────────────────────
export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Get Single Task ──────────────────────────────────────────────────────────
export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const activities = await Activity.find({ taskId: req.params.id.toString() })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ task, activities });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Create Task ──────────────────────────────────────────────────────────────
export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, status, priority, assignee, dueDate } = req.body;

    if (!title) {
      res.status(400).json({ message: 'Title is required' });
      return;
    }

    if (title.length > 100) {
      res.status(400).json({ message: 'Title must be 100 characters or less' });
      return;
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'Todo',
      priority: priority || 'Medium',
      assignee,
      dueDate,
      createdBy: req.user!.userId,
    });

    await Activity.create({
      taskId: task._id.toString(),
      taskTitle: task.title,
      action: 'created',
      performedBy: req.user!.userId,
      performedByUsername: req.user!.username,
      details: `Task "${task.title}" was created`,
    });

    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Update Task ──────────────────────────────────────────────────────────────
export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, status, priority, assignee, dueDate } = req.body;

    if (title && title.length > 100) {
      res.status(400).json({ message: 'Title must be 100 characters or less' });
      return;
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, status, priority, assignee, dueDate },
      { new: true, runValidators: true }
    );

    if (!task) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await Activity.create({
      taskId: task._id.toString(),
      taskTitle: task.title,
      action: 'updated',
      performedBy: req.user!.userId,
      performedByUsername: req.user!.username,
      details: `Task "${task.title}" was updated`,
    });

    res.status(200).json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Delete Task ──────────────────────────────────────────────────────────────
export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await Activity.create({
      taskId: req.params.id.toString(),
      taskTitle: task.title,
      action: 'deleted',
      performedBy: req.user!.userId,
      performedByUsername: req.user!.username,
      details: `Task "${task.title}" was deleted`,
    });

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};