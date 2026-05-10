import { body } from 'express-validator';
import Department from '../models/Department.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { roleLevels, isCompanyAdmin } from '../constants/roles.js';
import { recordActivity } from '../services/activityService.js';
import {
  assignManager,
  buildOrganizationTree,
  getDescendantIds,
  getReportingChain,
  getVisibleEmployeeIds
} from '../services/hierarchyService.js';
import {
  assignEmployeeToDepartment,
  getDepartmentStructure,
  getTeamStructure,
  listTeamsForViewer,
  transferEmployeeToTeam
} from '../services/organizationStructureService.js';

export const departmentRules = [
  body('name').trim().isLength({ min: 2 }).withMessage('Department name is required'),
  body('code').trim().isLength({ min: 2, max: 16 }).withMessage('Department code is required')
];

export const teamRules = [
  body('name').trim().isLength({ min: 2 }).withMessage('Team name is required'),
  body('department').optional().isMongoId(),
  body('lead').optional().isMongoId()
];

export const managerRules = [
  body('employeeId').isMongoId().withMessage('Employee id is required'),
  body('managerId').isMongoId().withMessage('Manager id is required')
];

export const departmentAssignmentRules = [
  body('employeeId').isMongoId().withMessage('Employee id is required'),
  body('departmentId').isMongoId().withMessage('Department id is required')
];

export const teamTransferRules = [
  body('employeeId').isMongoId().withMessage('Employee id is required'),
  body('teamId').isMongoId().withMessage('Team id is required')
];

export const listDepartments = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.workspace) query.workspace = req.query.workspace;
  const items = await Department.find(query)
    .populate('manager departmentHead departmentMembers', 'name email employeeId role designation')
    .populate('projects', 'name key status color')
    .sort({ name: 1 });
  res.json({ items });
});

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await Department.create({
    name: req.body.name,
    code: req.body.code,
    workspace: req.body.workspace || req.user.companyId || req.user.workspace,
    parentDepartment: req.body.parentDepartment,
    manager: req.body.manager || req.body.departmentHead,
    departmentHead: req.body.departmentHead || req.body.manager,
    description: req.body.description
  });
  await recordActivity({
    req,
    action: 'organization.department_created',
    entityType: 'Department',
    entityId: department._id,
    workspace: department.workspace
  });
  res.status(201).json(department);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.departmentId);
  if (!department) {
    res.status(404);
    throw new Error('Department not found');
  }
  ['name', 'departmentName', 'code', 'description', 'parentDepartment', 'manager', 'departmentHead', 'active'].forEach((field) => {
    if (req.body[field] !== undefined) department[field] = req.body[field];
  });
  if (req.body.departmentHead || req.body.manager) {
    department.departmentHead = req.body.departmentHead || req.body.manager;
    department.manager = req.body.manager || req.body.departmentHead;
  }
  await department.save();
  await recordActivity({
    req,
    action: 'organization.department_updated',
    entityType: 'Department',
    entityId: department._id,
    workspace: department.workspace
  });
  req.app.get('io')?.emit?.('organization:department-updated', { departmentId: department._id });
  res.json(await department.populate('manager departmentHead departmentMembers projects', 'name email role designation key status color'));
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.departmentId);
  if (!department) {
    res.status(404);
    throw new Error('Department not found');
  }
  await Promise.all([
    Team.updateMany({ department: department._id }, { $unset: { department: '' } }),
    User.updateMany({ department: department._id }, { $unset: { department: '' } }),
    Department.deleteOne({ _id: department._id })
  ]);
  await recordActivity({
    req,
    action: 'organization.department_deleted',
    entityType: 'Department',
    entityId: department._id,
    workspace: department.workspace
  });
  req.app.get('io')?.emit?.('organization:department-deleted', { departmentId: department._id });
  res.status(204).end();
});

export const listTeams = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 24 } = req.query;
  const allItems = await listTeamsForViewer(req.user);
  const filtered = search
    ? allItems.filter((team) =>
        [team.name, team.teamName, team.lead?.name, team.teamLead?.name, team.department?.name, team.department?.departmentName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search.toLowerCase()))
      )
    : allItems;
  const start = (Number(page) - 1) * Number(limit);
  const items = filtered.slice(start, start + Number(limit));
  res.json({ items, total: filtered.length, page: Number(page), pages: Math.ceil(filtered.length / Number(limit)) || 1 });
});

export const createTeam = asyncHandler(async (req, res) => {
  const team = await Team.create({
    name: req.body.name,
    teamName: req.body.teamName || req.body.name,
    workspace: req.body.workspace || req.user.companyId || req.user.workspace,
    lead: req.body.lead || req.body.teamLead,
    teamLead: req.body.teamLead || req.body.lead,
    department: req.body.department,
    members: req.body.members || [],
    assignedProjects: req.body.assignedProjects || []
  });
  if (team.department) {
    await Department.updateOne(
      { _id: team.department },
      { $addToSet: { departmentMembers: { $each: [...team.members, team.lead].filter(Boolean) } } }
    );
  }
  await recordActivity({
    req,
    action: 'organization.team_created',
    entityType: 'Team',
    entityId: team._id,
    workspace: team.workspace
  });
  res.status(201).json(await team.populate('lead teamLead members department assignedProjects', 'name email role designation code key status color'));
});

export const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId);
  if (!team || team.active === false) {
    res.status(404);
    throw new Error('Team not found');
  }
  ['name', 'teamName', 'department', 'lead', 'teamLead', 'members', 'assignedProjects', 'permissions'].forEach((field) => {
    if (req.body[field] !== undefined) team[field] = req.body[field];
  });
  if (req.body.lead || req.body.teamLead) {
    team.lead = req.body.lead || req.body.teamLead;
    team.teamLead = req.body.teamLead || req.body.lead;
  }
  await team.save();
  await recordActivity({
    req,
    action: 'organization.team_updated',
    entityType: 'Team',
    entityId: team._id,
    workspace: team.workspace
  });
  req.app.get('io')?.emit?.('organization:team-updated', { teamId: team._id });
  res.json(await team.populate('lead teamLead members department assignedProjects', 'name email role designation code key status color'));
});

export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId);
  if (!team || team.active === false) {
    res.status(404);
    throw new Error('Team not found');
  }

  const updates = [
    Project.updateMany({ assignedTeam: team._id }, { $unset: { assignedTeam: '' } }),
    Project.updateMany({ assignedEmployees: { $in: team.members } }, { $pull: { assignedEmployees: { $in: team.members } } })
  ];
  const leadId = team.lead || team.teamLead;
  if (leadId) {
    updates.push(
      User.updateMany(
        { $or: [{ teamLeadId: leadId }, { teamLead: leadId }] },
        { $unset: { teamLeadId: '', teamLead: '' } }
      )
    );
  }
  await Promise.all(updates);
  team.active = false;
  team.archivedAt = new Date();
  team.archivedBy = req.user._id;
  await team.save();

  await recordActivity({
    req,
    action: 'organization.team_archived',
    entityType: 'Team',
    entityId: team._id,
    workspace: team.workspace
  });
  req.app.get('io')?.emit?.('organization:team-deleted', { teamId: team._id });
  res.status(204).end();
});

export const getCompanyStructure = asyncHandler(async (req, res) => {
  const departments = await getDepartmentStructure({ viewer: req.user });
  res.json({ items: departments });
});

export const getDepartmentDetails = asyncHandler(async (req, res) => {
  const [department] = await getDepartmentStructure({ departmentId: req.params.departmentId, viewer: req.user });
  if (!department) {
    res.status(404);
    throw new Error('Department not found');
  }
  res.json(department);
});

export const getTeamDetails = asyncHandler(async (req, res) => {
  const team = await getTeamStructure({ teamId: req.params.teamId, viewer: req.user });
  if (!team) {
    res.status(team === false ? 403 : 404);
    throw new Error(team === false ? 'You cannot view this team' : 'Team not found');
  }
  res.json(team);
});

export const getOrganizationTree = asyncHandler(async (req, res) => {
  const tree = await buildOrganizationTree({
    companyId: req.query.companyId || req.user.companyId || req.user.workspace,
    rootId: req.query.rootId,
    viewer: req.user
  });
  res.json({ items: tree });
});

export const getSubordinates = asyncHandler(async (req, res) => {
  const managerId = req.params.managerId || req.user._id;
  if (!isCompanyAdmin(req.user) && String(managerId) !== String(req.user._id)) {
    const visibleIds = await getDescendantIds(req.user._id);
    if (!visibleIds.some((id) => String(id) === String(managerId))) {
      res.status(403);
      throw new Error('You can only inspect your reporting tree');
    }
  }
  const ids = await getDescendantIds(managerId);
  const items = await User.find({ _id: { $in: ids } })
    .populate('department managerId teamLeadId', 'name code email role designation')
    .sort({ hierarchyLevel: 1, name: 1 });
  res.json({ items, total: items.length });
});

export const getMyReportingChain = asyncHandler(async (req, res) => {
  const chain = await getReportingChain(req.params.userId || req.user._id);
  res.json({ items: chain });
});

export const assignEmployeeManager = asyncHandler(async (req, res) => {
  const employee = await assignManager({
    employeeId: req.body.employeeId,
    managerId: req.body.managerId,
    actor: req.user
  });
  await recordActivity({
    req,
    action: 'organization.employee_moved',
    entityType: 'User',
    entityId: employee._id,
    workspace: employee.companyId || employee.workspace,
    metadata: { managerId: req.body.managerId }
  });
  req.app.get('io')?.emit?.('organization:updated', { employeeId: employee._id, managerId: req.body.managerId });
  res.json(employee);
});

export const assignDepartment = asyncHandler(async (req, res) => {
  const employee = await assignEmployeeToDepartment({
    employeeId: req.body.employeeId,
    departmentId: req.body.departmentId,
    actor: req.user
  });
  await recordActivity({
    req,
    action: 'organization.employee_department_assigned',
    entityType: 'User',
    entityId: employee._id,
    workspace: employee.companyId || employee.workspace,
    metadata: { departmentId: req.body.departmentId }
  });
  req.app.get('io')?.emit?.('organization:department-updated', {
    employeeId: employee._id,
    departmentId: req.body.departmentId
  });
  res.json(employee);
});

export const transferTeam = asyncHandler(async (req, res) => {
  const employee = await transferEmployeeToTeam({
    employeeId: req.body.employeeId,
    teamId: req.body.teamId,
    actor: req.user
  });
  await recordActivity({
    req,
    action: 'organization.employee_team_transferred',
    entityType: 'User',
    entityId: employee._id,
    workspace: employee.companyId || employee.workspace,
    metadata: { teamId: req.body.teamId }
  });
  req.app.get('io')?.emit?.('organization:team-updated', {
    employeeId: employee._id,
    teamId: req.body.teamId
  });
  res.json(employee);
});

export const updateEmployeeRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.employeeId);
  if (!user) {
    res.status(404);
    throw new Error('Employee not found');
  }
  ['role', 'designation', 'workRole', 'employmentType', 'joiningDate', 'department', 'departmentId', 'teamLeadId', 'teamLead', 'companyId', 'workspace'].forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });
  if (req.body.role) user.hierarchyLevel = roleLevels[req.body.role] ?? user.hierarchyLevel;
  await user.save();
  await recordActivity({
    req,
    action: 'organization.employee_updated',
    entityType: 'User',
    entityId: user._id,
    workspace: user.companyId || user.workspace,
    metadata: { role: user.role, designation: user.designation }
  });
  res.json(await user.populate('department managerId teamLeadId', 'name code email role designation'));
});

export const hierarchyDashboard = asyncHandler(async (req, res) => {
  const visibleIds = await getVisibleEmployeeIds(req.user);
  const userQuery = visibleIds ? { _id: { $in: visibleIds } } : {};
  const taskQuery = visibleIds ? { assignee: { $in: visibleIds } } : {};
  const [employees, departments, byRole, workload, pendingApprovals] = await Promise.all([
    User.countDocuments(userQuery),
    Department.countDocuments(req.user.companyId ? { workspace: req.user.companyId } : {}),
    User.aggregate([{ $match: userQuery }, { $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Task.aggregate([
      { $match: taskQuery },
      { $group: { _id: '$assignee', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$user.name', 'Unassigned'] }, role: '$user.role', total: 1, completed: 1 } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]),
    Task.countDocuments({ ...taskQuery, approvalStatus: 'Pending' })
  ]);
  res.json({ employees, departments, byRole, workload, pendingApprovals });
});
