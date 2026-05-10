import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Department from '../models/Department.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { buildVisibleProjectQuery } from '../utils/projectAccess.js';
import { isCompanyAdmin } from '../constants/roles.js';
import { getVisibleEmployeeIds } from '../services/hierarchyService.js';

export const dashboard = asyncHandler(async (req, res) => {
  const projectQuery = await buildVisibleProjectQuery(req.user);
  const projects = await Project.find(projectQuery).select('_id');
  const projectIds = projects.map((project) => project._id);
  const taskQuery = isCompanyAdmin(req.user) ? {} : { project: { $in: projectIds } };
  const now = new Date();

  const [totalProjects, totalTasks, completedTasks, overdueTasks, byStatus, byPriority, productivity] =
    await Promise.all([
      Project.countDocuments(projectQuery),
      Task.countDocuments(taskQuery),
      Task.countDocuments({ ...taskQuery, status: 'Completed' }),
      Task.countDocuments({ ...taskQuery, status: { $ne: 'Completed' }, dueDate: { $lt: now } }),
      Task.aggregate([{ $match: taskQuery }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $match: taskQuery }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Task.aggregate([
        { $match: taskQuery },
        { $group: { _id: '$assignee', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$user.name', 'Unassigned'] }, total: 1, completed: 1 } },
        { $sort: { completed: -1 } },
        { $limit: 8 }
      ])
    ]);

  res.json({ totalProjects, totalTasks, completedTasks, overdueTasks, byStatus, byPriority, productivity });
});

const workspaceQuery = (user) => {
  const workspace = user.companyId || user.workspace;
  return workspace ? { $or: [{ workspace }, { companyId: workspace }] } : {};
};

const scoreFrom = ({ total = 0, completed = 0, overdue = 0, approved = 0, rejected = 0, high = 0 }) => {
  if (!total) return 0;
  const completion = (completed / total) * 40;
  const onTime = Math.max(0, ((total - overdue) / total) * 25);
  const priorityImpact = Math.min(20, (high / total) * 20 + 8);
  const approvalTotal = approved + rejected;
  const quality = approvalTotal ? (approved / approvalTotal) * 15 : 11;
  const penalty = Math.min(20, overdue * 2 + rejected * 3);
  return Math.max(0, Math.min(100, Math.round(completion + onTime + priorityImpact + quality - penalty)));
};

export const enterpriseOverview = asyncHandler(async (req, res) => {
  const visibleEmployeeIds = await getVisibleEmployeeIds(req.user);
  const projectQuery = await buildVisibleProjectQuery(req.user);
  const projects = await Project.find({ ...projectQuery, archived: false }).select('_id department assignedTeam status dueDate');
  const projectIds = projects.map((project) => project._id);
  const employeeQuery = visibleEmployeeIds ? { _id: { $in: visibleEmployeeIds } } : {};
  const taskQuery = isCompanyAdmin(req.user) ? {} : { project: { $in: projectIds } };
  const now = new Date();

  const [departments, teams, employees, tasks, pendingApprovals, overdueTasks, activeProjects, completedTasks] = await Promise.all([
    Department.countDocuments(workspaceQuery(req.user)),
    Team.countDocuments(workspaceQuery(req.user)),
    User.countDocuments(employeeQuery),
    Task.countDocuments(taskQuery),
    Task.countDocuments({ ...taskQuery, approvalStatus: 'Pending' }),
    Task.countDocuments({ ...taskQuery, status: { $ne: 'Completed' }, dueDate: { $lt: now } }),
    Project.countDocuments({ ...projectQuery, archived: false, status: 'Active' }),
    Task.countDocuments({ ...taskQuery, status: 'Completed' })
  ]);

  const performanceScore = scoreFrom({ total: tasks, completed: completedTasks, overdue: overdueTasks });
  res.json({
    departments,
    teams,
    employees,
    projects: projects.length,
    activeProjects,
    tasks,
    completedTasks,
    pendingApprovals,
    overdueTasks,
    performanceScore
  });
});

export const departmentPerformance = asyncHandler(async (req, res) => {
  const projectQuery = await buildVisibleProjectQuery(req.user);
  const departments = await Department.find(workspaceQuery(req.user))
    .populate('departmentHead manager', 'name email role designation')
    .sort({ name: 1 })
    .lean();

  const results = await Promise.all(
    departments.map(async (department) => {
      const departmentProjects = await Project.find({
        ...projectQuery,
        archived: false,
        department: department._id
      }).select('_id status');
      const projectIds = departmentProjects.map((project) => project._id);
      const members = await User.find({ department: department._id }).select('name role designation managerId teamLeadId');
      const teams = await Team.find({ department: department._id }).select('name teamName lead teamLead members');
      const tasks = await Task.find({ project: { $in: projectIds } }).select('status priority dueDate approvalStatus');
      const now = new Date();
      const completed = tasks.filter((task) => task.status === 'Completed').length;
      const overdue = tasks.filter((task) => task.status !== 'Completed' && task.dueDate && task.dueDate < now).length;
      const approved = tasks.filter((task) => task.approvalStatus === 'Approved').length;
      const rejected = tasks.filter((task) => task.approvalStatus === 'Rejected').length;
      const high = tasks.filter((task) => task.priority === 'High').length;

      return {
        _id: department._id,
        name: department.departmentName || department.name,
        code: department.code,
        head: department.departmentHead || department.manager,
        employees: members.length,
        teams: teams.length,
        projects: departmentProjects.length,
        activeProjects: departmentProjects.filter((project) => project.status === 'Active').length,
        tasks: tasks.length,
        completedTasks: completed,
        overdueTasks: overdue,
        pendingApprovals: tasks.filter((task) => task.approvalStatus === 'Pending').length,
        performanceScore: scoreFrom({ total: tasks.length, completed, overdue, approved, rejected, high }),
        riskScore: Math.min(100, Math.round(overdue * 8 + rejected * 6 + Math.max(0, tasks.length - completed) * 0.8))
      };
    })
  );

  res.json({ items: results });
});

export const teamPerformance = asyncHandler(async (req, res) => {
  const teams = await Team.find({ ...workspaceQuery(req.user), active: { $ne: false } })
    .populate('lead teamLead', 'name email role designation')
    .populate('department', 'name departmentName code')
    .lean();
  const projectQuery = await buildVisibleProjectQuery(req.user);

  const items = await Promise.all(
    teams.map(async (team) => {
      const memberIds = (team.members || []).map((id) => id);
      const teamProjectScope = {
        archived: false,
        $or: [{ assignedTeam: team._id }, { 'members.user': { $in: memberIds } }, { assignedEmployees: { $in: memberIds } }]
      };
      const projects = await Project.find(Object.keys(projectQuery).length ? { $and: [projectQuery, teamProjectScope] } : teamProjectScope).select('_id status');
      const tasks = await Task.find({
        $or: [{ project: { $in: projects.map((project) => project._id) } }, { assignee: { $in: memberIds } }]
      }).select('status priority dueDate approvalStatus assignee');
      const now = new Date();
      const completed = tasks.filter((task) => task.status === 'Completed').length;
      const overdue = tasks.filter((task) => task.status !== 'Completed' && task.dueDate && task.dueDate < now).length;

      return {
        _id: team._id,
        name: team.teamName || team.name,
        department: team.department,
        lead: team.teamLead || team.lead,
        members: memberIds.length,
        projects: projects.length,
        tasks: tasks.length,
        completedTasks: completed,
        overdueTasks: overdue,
        pendingApprovals: tasks.filter((task) => task.approvalStatus === 'Pending').length,
        performanceScore: scoreFrom({
          total: tasks.length,
          completed,
          overdue,
          approved: tasks.filter((task) => task.approvalStatus === 'Approved').length,
          rejected: tasks.filter((task) => task.approvalStatus === 'Rejected').length,
          high: tasks.filter((task) => task.priority === 'High').length
        })
      };
    })
  );

  res.json({ items });
});

export const employeePerformance = asyncHandler(async (req, res) => {
  const visibleEmployeeIds = await getVisibleEmployeeIds(req.user);
  const userQuery = visibleEmployeeIds ? { _id: { $in: visibleEmployeeIds } } : {};
  const employees = await User.find(userQuery)
    .populate('department managerId teamLeadId', 'name departmentName code role designation')
    .sort({ hierarchyLevel: 1, name: 1 })
    .lean();

  const items = await Promise.all(
    employees.map(async (employee) => {
      const tasks = await Task.find({ assignee: employee._id }).select('status priority dueDate approvalStatus');
      const now = new Date();
      const completed = tasks.filter((task) => task.status === 'Completed').length;
      const overdue = tasks.filter((task) => task.status !== 'Completed' && task.dueDate && task.dueDate < now).length;
      const rejected = tasks.filter((task) => task.approvalStatus === 'Rejected').length;
      const approved = tasks.filter((task) => task.approvalStatus === 'Approved').length;

      return {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        designation: employee.designation || employee.title,
        department: employee.department,
        manager: employee.managerId,
        teamLead: employee.teamLeadId,
        assignedTasks: tasks.length,
        completedTasks: completed,
        overdueTasks: overdue,
        pendingApprovals: tasks.filter((task) => task.approvalStatus === 'Pending').length,
        reworkTasks: rejected,
        performanceScore: scoreFrom({
          total: tasks.length,
          completed,
          overdue,
          approved,
          rejected,
          high: tasks.filter((task) => task.priority === 'High').length
        }),
        weeklyCapacityHours: employee.weeklyCapacityHours ?? 40,
        maxActiveTasks: employee.maxActiveTasks ?? 8,
        activeTasks: tasks.filter((task) => !['Completed'].includes(task.status)).length,
        workloadLevel:
          tasks.filter((task) => !['Completed'].includes(task.status)).length > (employee.maxActiveTasks ?? 8)
            ? 'Over capacity'
            : tasks.length >= 6
              ? 'Balanced'
              : 'Available'
      };
    })
  );

  res.json({ items });
});

export const projectRisk = asyncHandler(async (req, res) => {
  const projectQuery = await buildVisibleProjectQuery(req.user);
  const projects = await Project.find({ ...projectQuery, archived: false })
    .populate('department', 'name departmentName code')
    .populate('assignedTeam', 'name teamName')
    .sort({ updatedAt: -1 })
    .lean();
  const now = new Date();

  const items = await Promise.all(
    projects.map(async (project) => {
      const tasks = await Task.find({ project: project._id }).select('status dueDate approvalStatus labels priority');
      const active = tasks.filter((task) => task.status !== 'Completed');
      const overdue = active.filter((task) => task.dueDate && task.dueDate < now);
      const blocked = active.filter((task) => (task.labels || []).some((label) => label.toLowerCase() === 'blocked') || task.approvalStatus === 'Rejected');
      const dueSoon = project.dueDate ? Math.ceil((new Date(project.dueDate) - now) / (1000 * 60 * 60 * 24)) : null;
      const overdueRatio = tasks.length ? overdue.length / tasks.length : 0;
      const deadlineRisk = dueSoon !== null && dueSoon < 0 ? 35 : dueSoon !== null && dueSoon <= 7 ? 22 : 6;
      const riskScore = Math.min(100, Math.round(overdueRatio * 45 + blocked.length * 10 + deadlineRisk + active.filter((task) => task.priority === 'High').length * 3));

      return {
        _id: project._id,
        name: project.name,
        key: project.key,
        status: project.status,
        department: project.department,
        assignedTeam: project.assignedTeam,
        dueDate: project.dueDate,
        totalTasks: tasks.length,
        activeTasks: active.length,
        overdueTasks: overdue.length,
        blockedTasks: blocked.length,
        overdueRatio: Math.round(overdueRatio * 100),
        daysToDeadline: dueSoon,
        riskScore,
        riskLevel: riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low'
      };
    })
  );

  res.json({ items });
});

export const workloadCapacity = asyncHandler(async (req, res) => {
  const visibleEmployeeIds = await getVisibleEmployeeIds(req.user);
  const userQuery = visibleEmployeeIds ? { _id: { $in: visibleEmployeeIds } } : {};
  const employees = await User.find(userQuery).populate('department', 'name departmentName code').lean();
  const items = await Promise.all(
    employees.map(async (employee) => {
      const activeTasks = await Task.countDocuments({ assignee: employee._id, status: { $ne: 'Completed' } });
      const maxActiveTasks = employee.maxActiveTasks ?? 8;
      return {
        _id: employee._id,
        name: employee.name,
        department: employee.department,
        weeklyCapacityHours: employee.weeklyCapacityHours ?? 40,
        maxActiveTasks,
        activeTasks,
        utilization: Math.min(160, Math.round((activeTasks / maxActiveTasks) * 100)),
        status: activeTasks > maxActiveTasks ? 'Over allocated' : activeTasks >= maxActiveTasks * 0.75 ? 'Near capacity' : 'Available'
      };
    })
  );
  res.json({ items });
});
