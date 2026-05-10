import { body } from 'express-validator';
import SavedFilter from '../models/SavedFilter.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const savedFilterRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Filter name is required'),
  body('query').optional().isObject()
];

export const listSavedFilters = asyncHandler(async (req, res) => {
  const items = await SavedFilter.find({
    $or: [{ owner: req.user._id }, { shared: true }],
    ...(req.query.module ? { module: req.query.module } : {})
  }).sort({ updatedAt: -1 });
  res.json({ items });
});

export const createSavedFilter = asyncHandler(async (req, res) => {
  const item = await SavedFilter.create({
    name: req.body.name,
    module: req.body.module || 'tasks',
    owner: req.user._id,
    workspace: req.user.companyId || req.user.workspace,
    query: req.body.query || {},
    sort: req.body.sort,
    shared: req.body.shared || false
  });
  res.status(201).json(item);
});

export const deleteSavedFilter = asyncHandler(async (req, res) => {
  const item = await SavedFilter.findOne({ _id: req.params.id, owner: req.user._id });
  if (!item) {
    res.status(404);
    throw new Error('Saved filter not found');
  }
  await item.deleteOne();
  res.status(204).end();
});
