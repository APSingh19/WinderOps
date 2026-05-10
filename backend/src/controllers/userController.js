import { body } from 'express-validator';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { organizationRoles, normalizeRole, roleLevels, isCompanyAdmin } from '../constants/roles.js';
import { canManageEmployee, getReportingChain, getVisibleEmployeeIds } from '../services/hierarchyService.js';

export const createUserRules = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(organizationRoles).withMessage('Role is not supported'),
  body('title').optional().trim().isLength({ max: 80 }).withMessage('Title must be 80 characters or fewer'),
  body('managerId').optional().isMongoId(),
  body('teamLeadId').optional().isMongoId(),
  body('department').optional().isMongoId(),
  body('departmentId').optional().isMongoId(),
  body('employeeId').optional().trim().isLength({ max: 40 }),
  body('employmentType').optional().isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Consultant'])
];

export const updateProfileRules = [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('title').optional().trim().isLength({ max: 80 }),
  body('designation').optional().trim().isLength({ max: 120 }),
  body('workRole').optional().trim().isLength({ max: 120 }),
  body('bio').optional().trim().isLength({ max: 280 }),
  body('skills').optional().isArray(),
  body('skills.*').optional().trim().isLength({ max: 40 }),
  body('avatar').optional().trim().isLength({ max: 500 }),
  body('weeklyCapacityHours').optional().isInt({ min: 0, max: 168 }),
  body('maxActiveTasks').optional().isInt({ min: 1, max: 100 })
];

export const updateUserRules = [
  ...updateProfileRules,
  body('role').optional().isIn(organizationRoles).withMessage('Role is not supported'),
  body('employmentType').optional().isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Consultant']),
  body('managerId').optional().isMongoId(),
  body('teamLeadId').optional().isMongoId(),
  body('department').optional().isMongoId(),
  body('departmentId').optional().isMongoId()
];

export const listUsers = asyncHandler(async (req, res) => {
  const { search = '', department, role, page = 1, limit = 20 } = req.query;
  const visibleIds = await getVisibleEmployeeIds(req.user);
  const query = search
    ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] }
    : {};
  if (visibleIds) query._id = { $in: visibleIds };
  if (department) query.department = department;
  if (role) query.role = role;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    User.find(query)
      .populate('department managerId teamLeadId', 'name code email role designation')
      .sort({ hierarchyLevel: 1, name: 1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(query)
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

export const createUser = asyncHandler(async (req, res) => {
  const existing = await User.findOne({ email: req.body.email });
  if (existing) {
    res.status(409);
    throw new Error('Email is already registered');
  }

  const visibleIds = await getVisibleEmployeeIds(req.user);
  const requestedManager = req.body.managerId || (!isCompanyAdmin(req.user) ? req.user._id : undefined);
  if (requestedManager && visibleIds && !visibleIds.some((id) => String(id) === String(requestedManager))) {
    res.status(403);
    throw new Error('You can only place new employees in your reporting tree');
  }

  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: normalizeRole(req.body.role),
    title: req.body.title || req.body.designation || 'Team Member',
    designation: req.body.designation || req.body.title || 'Team Member',
    employeeId: req.body.employeeId,
    workRole: req.body.workRole || req.body.designation || req.body.title,
    employmentType: req.body.employmentType,
    joiningDate: req.body.joiningDate,
    managerId: requestedManager,
    reportingManager: requestedManager,
    teamLeadId: req.body.teamLeadId || req.body.teamLead,
    teamLead: req.body.teamLead || req.body.teamLeadId,
    department: req.body.department || req.body.departmentId,
    departmentId: req.body.departmentId || req.body.department,
    workspace: req.body.workspace || req.user.companyId || req.user.workspace,
    companyId: req.body.companyId || req.user.companyId || req.user.workspace,
    hierarchyLevel: roleLevels[normalizeRole(req.body.role)] ?? 5
  });
  if (user.managerId) await User.updateOne({ _id: user.managerId }, { $addToSet: { subordinates: user._id } });

  res.status(201).json(await user.populate('department managerId teamLeadId', 'name code email role designation'));
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (!isCompanyAdmin(req.user) && !(await canManageEmployee(req.user, user._id))) {
    res.status(403);
    throw new Error('You can only edit people in your reporting tree');
  }
  if (req.body.email && req.body.email !== user.email) {
    const existing = await User.findOne({ email: req.body.email });
    if (existing && String(existing._id) !== String(user._id)) {
      res.status(409);
      throw new Error('Email is already registered');
    }
    user.email = req.body.email;
  }
  [
    'name',
    'role',
    'title',
    'designation',
    'workRole',
    'employmentType',
    'bio',
    'skills',
    'avatar',
    'department',
    'departmentId',
    'managerId',
    'teamLeadId',
    'weeklyCapacityHours',
    'maxActiveTasks'
  ].forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });
  if (req.body.role) user.role = normalizeRole(req.body.role);
  if (req.body.managerId !== undefined) user.reportingManager = req.body.managerId || undefined;
  if (req.body.teamLeadId !== undefined) user.teamLead = req.body.teamLeadId || undefined;
  if (req.body.department !== undefined) user.departmentId = req.body.department || undefined;
  await user.save();
  res.json(await user.populate('department managerId teamLeadId', 'name code email role designation'));
});

export const updateProfile = asyncHandler(async (req, res) => {
  if (req.body.email && req.body.email !== req.user.email) {
    const existing = await User.findOne({ email: req.body.email });
    if (existing && String(existing._id) !== String(req.user._id)) {
      res.status(409);
      throw new Error('Email is already registered');
    }
    req.user.email = req.body.email;
  }
  const fields = ['name', 'title', 'designation', 'workRole', 'bio', 'skills', 'avatar', 'weeklyCapacityHours', 'maxActiveTasks'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  });
  await req.user.save();
  res.json(req.user);
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const visibleIds = await getVisibleEmployeeIds(req.user);
  if (visibleIds && !visibleIds.some((id) => String(id) === String(req.params.id))) {
    res.status(403);
    throw new Error('You can only view people in your reporting tree');
  }
  const user = await User.findById(req.params.id)
    .populate('department departmentId', 'name departmentName code')
    .populate('managerId reportingManager teamLeadId teamLead', 'name email role designation avatar');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const [stats, tasks, projects, reportingChain, directReports] = await Promise.all([
    Task.aggregate([
      { $match: { assignee: user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Task.find({ assignee: user._id })
      .populate('project', 'name key color')
      .sort({ updatedAt: -1 })
      .limit(10),
    Project.find({
      archived: false,
      $or: [
        { owner: user._id },
        { projectManager: user._id },
        { teamLeaders: user._id },
        { coLeaders: user._id },
        { 'members.user': user._id },
        { assignedEmployees: user._id }
      ]
    })
      .select('name key color status department assignedTeam')
      .populate('department', 'name departmentName code')
      .populate('assignedTeam', 'name teamName')
      .sort({ updatedAt: -1 })
      .limit(10),
    getReportingChain(user._id),
    User.find({ managerId: user._id })
      .select('name email avatar role designation employeeId')
      .sort({ hierarchyLevel: 1, name: 1 })
      .limit(20)
  ]);
  res.json({ user, stats, tasks, projects, reportingChain, directReports });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    res.status(400);
    throw new Error('You cannot remove your own account');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await Promise.all([
    Project.updateMany({}, { $pull: { members: { user: user._id } } }),
    Task.updateMany({ assignee: user._id }, { $unset: { assignee: '' } }),
    User.updateMany({ managerId: user._id }, { $unset: { managerId: '', teamLeadId: '' } }),
    User.updateMany({}, { $pull: { subordinates: user._id } })
  ]);
  await user.deleteOne();

  res.status(204).end();
});
