import { body } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { buildVisibleProjectQuery, canManageProject } from '../utils/projectAccess.js';
import { createNotification } from '../utils/notifications.js';
import { isCompanyAdmin } from '../constants/roles.js';
import { canManageEmployee } from '../services/hierarchyService.js';

export const projectRules = [
  body('name').trim().isLength({ min: 2 }).withMessage('Project name is required'),
  body('key').trim().isLength({ min: 2, max: 12 }).withMessage('Project key is required'),
  body('status').optional().isIn(['Planning', 'Active', 'On Hold', 'Completed']),
  body('projectManager').optional().isMongoId(),
  body('coLeaders').optional().isArray(),
  body('teamLeaders').optional().isArray(),
  body('department').optional().isMongoId(),
  body('assignedTeam').optional().isMongoId(),
  body('assignedEmployees').optional().isArray()
];

export const updateProjectRules = [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Project name is required'),
  body('key').optional().trim().isLength({ min: 2, max: 12 }).withMessage('Project key is required'),
  body('status').optional().isIn(['Planning', 'Active', 'On Hold', 'Completed']),
  body('projectManager').optional().isMongoId(),
  body('coLeaders').optional().isArray(),
  body('teamLeaders').optional().isArray(),
  body('department').optional().isMongoId(),
  body('assignedTeam').optional().isMongoId(),
  body('assignedEmployees').optional().isArray()
];

const projectPopulate = 'name email avatar title role designation';

export const listProjects = asyncHandler(async (req, res) => {
  const { search = '', status, department, team, page = 1, limit = 12 } = req.query;
  const query = { ...(await buildVisibleProjectQuery(req.user)), archived: false };
  if (status) query.status = status;
  if (department) query.department = department;
  if (team) query.assignedTeam = team;
  if (search) query.$text = { $search: search };
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Project.find(query)
      .populate('owner projectManager coLeaders teamLeaders members.user subTeams.lead subTeams.members', projectPopulate)
      .populate('department', 'name code')
      .populate('assignedTeam', 'name teamName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Project.countDocuments(query)
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

export const createProject = asyncHandler(async (req, res) => {
  const projectManager = req.body.projectManager || req.user._id;
  const leadershipMembers = [
    { user: req.user._id, role: 'Owner' },
    ...(String(projectManager) !== String(req.user._id) ? [{ user: projectManager, role: 'Project Manager' }] : []),
    ...(req.body.coLeaders || []).map((user) => ({ user, role: 'Co-Leader' })),
    ...(req.body.teamLeaders || []).map((user) => ({ user, role: 'Team Leader' }))
  ];
  const project = await Project.create({
    ...req.body,
    owner: req.user._id,
    projectManager,
    workspace: req.body.workspace || req.user.companyId || req.user.workspace,
    companyId: req.body.companyId || req.user.companyId || req.user.workspace,
    members: [...leadershipMembers, ...(req.body.members || [])]
  });
  req.app.get('io')?.emit?.('project:leadership-updated', { projectId: project._id });
  res
    .status(201)
    .json(
      await project.populate(
        'owner projectManager coLeaders teamLeaders members.user subTeams.lead subTeams.members',
        projectPopulate
      )
    );
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ...(await buildVisibleProjectQuery(req.user)) })
    .populate('owner projectManager coLeaders teamLeaders members.user subTeams.lead subTeams.members', projectPopulate)
    .populate('department', 'name code')
    .populate('assignedTeam', 'name teamName')
    .populate('assignedEmployees', projectPopulate)
    .lean();
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  const taskStats = await Task.aggregate([
    { $match: { project: project._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  res.json({ ...project, taskStats });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  if (!canManageProject(project, req.user)) {
    res.status(403);
    throw new Error('Only project admins can update this project');
  }
  [
    'name',
    'key',
    'description',
    'status',
    'color',
    'startDate',
    'dueDate',
    'projectManager',
    'coLeaders',
    'teamLeaders',
    'department',
    'assignedTeam',
    'assignedEmployees',
    'subTeams'
  ].forEach((field) => {
    if (req.body[field] !== undefined) project[field] = req.body[field];
  });
  await project.save();
  req.app.get('io')?.emit?.('project:leadership-updated', { projectId: project._id });
  res.json(
    await project.populate('owner projectManager coLeaders teamLeaders members.user subTeams.lead subTeams.members assignedEmployees', projectPopulate)
  );
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  if (!canManageProject(project, req.user)) {
    res.status(403);
    throw new Error('Only project admins can delete this project');
  }
  await Task.deleteMany({ project: project._id });
  await project.deleteOne();
  res.status(204).end();
});

export const addMember = asyncHandler(async (req, res) => {
  if (!req.body.userId) {
    res.status(400);
    throw new Error('User id is required');
  }
  const project = await Project.findById(req.params.id);
  if (!project || !canManageProject(project, req.user)) {
    res.status(project ? 403 : 404);
    throw new Error(project ? 'Only project admins can add members' : 'Project not found');
  }
  if (!isCompanyAdmin(req.user) && !(await canManageEmployee(req.user, req.body.userId)) && String(req.user._id) !== req.body.userId) {
    res.status(403);
    throw new Error('You can only add members from your reporting structure');
  }
  const exists = project.members.some((member) => String(member.user) === req.body.userId);
  if (!exists) project.members.push({ user: req.body.userId, role: req.body.role || 'Member' });
  await project.save();
  await createNotification({
    recipient: req.body.userId,
    actor: req.user._id,
    project: project._id,
    type: 'PROJECT_INVITE',
    message: `You were added to ${project.name}`
  });
  req.app.get('io')?.emit?.('project:member-added', { projectId: project._id, userId: req.body.userId });
  res.json(await project.populate('owner projectManager coLeaders teamLeaders members.user', projectPopulate));
});

export const removeMember = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project || !canManageProject(project, req.user)) {
    res.status(project ? 403 : 404);
    throw new Error(project ? 'Only project admins can remove members' : 'Project not found');
  }
  if (String(project.owner) === req.params.userId) {
    res.status(400);
    throw new Error('Project owner cannot be removed');
  }
  project.members = project.members.filter((member) => String(member.user) !== req.params.userId);
  await project.save();
  req.app.get('io')?.emit?.('project:member-removed', { projectId: project._id, userId: req.params.userId });
  res.json(await project.populate('owner projectManager coLeaders teamLeaders members.user', projectPopulate));
});
