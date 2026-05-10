import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createNotification } from '../utils/notifications.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('actor project task', 'name title key')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(notifications);
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, _id: { $in: req.body.ids || [] } }, { read: true });
  res.json({ message: 'Notifications updated' });
});

export const createDueSoonNotifications = asyncHandler(async (req, res) => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tasks = await Task.find({
    assignee: { $ne: null },
    status: { $ne: 'Completed' },
    dueDate: { $lte: tomorrow, $gte: new Date() }
  });
  await Promise.all(
    tasks.map((task) =>
      createNotification({
        recipient: task.assignee,
        project: task.project,
        task: task._id,
        type: 'DUE_SOON',
        message: `"${task.title}" is due soon`
      })
    )
  );
  res.json({ count: tasks.length });
});
