import { body } from 'express-validator';
import Team from '../models/Team.js';
import Workspace from '../models/Workspace.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { randomToken } from '../utils/tokens.js';
import { recordActivity } from '../services/activityService.js';

export const workspaceRules = [
  body('name').trim().isLength({ min: 2 }).withMessage('Workspace name is required')
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);

const visibleWorkspaceQuery = (user) =>
  user.role === 'Admin' ? {} : { $or: [{ owner: user._id }, { 'members.user': user._id }] };

export const listWorkspaces = asyncHandler(async (req, res) => {
  const items = await Workspace.find(visibleWorkspaceQuery(req.user))
    .populate('owner members.user', 'name email avatar title')
    .sort({ updatedAt: -1 });
  res.json({ items });
});

export const createWorkspace = asyncHandler(async (req, res) => {
  const baseSlug = slugify(req.body.slug || req.body.name);
  const suffix = Math.random().toString(36).slice(2, 6);
  const workspace = await Workspace.create({
    name: req.body.name,
    slug: `${baseSlug}-${suffix}`,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'Owner' }],
    settings: req.body.settings || {}
  });
  await Team.create({ name: 'Core Team', workspace: workspace._id, lead: req.user._id, members: [req.user._id] });
  await recordActivity({ req, action: 'workspace.created', entityType: 'Workspace', entityId: workspace._id, workspace: workspace._id });
  res.status(201).json(await workspace.populate('owner members.user', 'name email avatar title'));
});

export const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findOne({ _id: req.params.id, ...visibleWorkspaceQuery(req.user) })
    .populate('owner members.user invites.invitedBy', 'name email avatar title')
    .lean();
  if (!workspace) {
    res.status(404);
    throw new Error('Workspace not found');
  }
  const teams = await Team.find({ workspace: workspace._id }).populate('lead members', 'name email avatar title');
  res.json({ ...workspace, teams });
});

export const inviteWorkspaceMember = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findOne({ _id: req.params.id, $or: [{ owner: req.user._id }, { members: { $elemMatch: { user: req.user._id, role: { $in: ['Owner', 'Admin'] } } } }] });
  if (!workspace) {
    res.status(403);
    throw new Error('Only workspace owners and admins can invite members');
  }
  workspace.invites.push({
    email: req.body.email,
    role: req.body.role || workspace.settings.defaultRole,
    token: randomToken(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    invitedBy: req.user._id
  });
  await workspace.save();
  await recordActivity({ req, action: 'workspace.member_invited', entityType: 'Workspace', entityId: workspace._id, workspace: workspace._id, metadata: { email: req.body.email } });
  res.status(201).json(workspace.invites.at(-1));
});

export const updateWorkspaceSettings = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findOne({ _id: req.params.id, $or: [{ owner: req.user._id }, { members: { $elemMatch: { user: req.user._id, role: { $in: ['Owner', 'Admin'] } } } }] });
  if (!workspace) {
    res.status(403);
    throw new Error('Only workspace owners and admins can update settings');
  }
  ['name', 'settings'].forEach((field) => {
    if (req.body[field] !== undefined) workspace[field] = req.body[field];
  });
  await workspace.save();
  await recordActivity({ req, action: 'workspace.settings_updated', entityType: 'Workspace', entityId: workspace._id, workspace: workspace._id });
  res.json(await workspace.populate('owner members.user', 'name email avatar title'));
});
