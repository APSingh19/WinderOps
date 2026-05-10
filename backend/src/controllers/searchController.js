import Project from '../models/Project.js';
import SavedFilter from '../models/SavedFilter.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const globalSearch = asyncHandler(async (req, res) => {
  const { q = '', status, priority, assignee, due, tags, project, sort = '-updatedAt' } = req.query;
  const taskQuery = {};
  if (q) taskQuery.$text = { $search: q };
  if (status) taskQuery.status = status;
  if (priority) taskQuery.priority = priority;
  if (assignee) taskQuery.assignee = assignee;
  if (project) taskQuery.project = project;
  if (tags) taskQuery.tags = { $in: String(tags).split(',').map((tag) => tag.trim()) };
  if (due === 'overdue') taskQuery.dueDate = { $lt: new Date() };
  const [tasks, projects, users] = await Promise.all([
    Task.find(taskQuery).populate('project', 'name key color').populate('assignee', 'name avatar email').sort(sort).limit(25),
    q ? Project.find({ $text: { $search: q } }).select('name key color status').limit(10) : [],
    q ? User.find({ $or: [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }] }).select('name email avatar title').limit(10) : []
  ]);
  res.json({ tasks, projects, users });
});

export const listSavedFilters = asyncHandler(async (req, res) => {
  const items = await SavedFilter.find({ $or: [{ owner: req.user._id }, { shared: true }] }).sort({ updatedAt: -1 });
  res.json({ items });
});

export const saveFilter = asyncHandler(async (req, res) => {
  const filter = await SavedFilter.create({
    name: req.body.name,
    owner: req.user._id,
    workspace: req.body.workspace,
    query: req.body.query || {},
    sort: req.body.sort || '-updatedAt',
    shared: Boolean(req.body.shared)
  });
  res.status(201).json(filter);
});
