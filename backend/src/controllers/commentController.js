import { body } from 'express-validator';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { emitToProject } from '../config/socket.js';
import { getProjectForUser } from '../utils/projectAccess.js';
import { createNotification } from '../utils/notifications.js';

export const commentRules = [body('body').trim().isLength({ min: 1, max: 1200 })];

export const listComments = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const project = await getProjectForUser(task.project, req.user);
  if (!project) {
    res.status(403);
    throw new Error('No project access');
  }
  const comments = await Comment.find({ task: task._id }).populate('author', 'name email avatar').sort({ createdAt: -1 });
  res.json(comments);
});

export const addComment = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const project = await getProjectForUser(task.project, req.user);
  if (!project) {
    res.status(403);
    throw new Error('No project access');
  }
  const comment = await Comment.create({ task: task._id, author: req.user._id, body: req.body.body });
  task.activity.push({ user: req.user._id, action: 'Comment added' });
  await task.save();
  const populated = await comment.populate('author', 'name email avatar');
  if (task.assignee) {
    await createNotification({
      recipient: task.assignee,
      actor: req.user._id,
      project: task.project,
      task: task._id,
      type: 'COMMENT_ADDED',
      message: `New comment on "${task.title}"`
    });
  }
  emitToProject(task.project, 'comment:created', populated);
  res.status(201).json(populated);
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }
  const task = await Task.findById(comment.task);
  const project = await getProjectForUser(task.project, req.user);
  const isAuthor = String(comment.author) === String(req.user._id);
  if (!project || (!isAuthor && req.user.role !== 'Admin')) {
    res.status(403);
    throw new Error('Cannot delete this comment');
  }
  await comment.deleteOne();
  res.status(204).end();
});
