import mongoose from 'mongoose';
import Department from '../models/Department.js';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { isCompanyAdmin } from '../constants/roles.js';
import { canManageEmployee, getVisibleEmployeeIds } from './hierarchyService.js';

const employeeFields = 'name email avatar employeeId title designation workRole role department managerId teamLeadId hierarchyLevel joiningDate employmentType';
const projectFields = 'name key status color department assignedTeam projectManager teamLeaders members';

const scopedDepartmentQuery = async (viewer) => {
  if (isCompanyAdmin(viewer)) return {};
  const visibleIds = await getVisibleEmployeeIds(viewer);
  return {
    $or: [
      { manager: viewer._id },
      { departmentHead: viewer._id },
      { departmentMembers: { $in: visibleIds } }
    ]
  };
};

const isVisibleTeam = async (team, viewer) => {
  if (isCompanyAdmin(viewer)) return true;
  if (String(team.lead || team.teamLead || '') === String(viewer._id)) return true;
  const visibleIds = await getVisibleEmployeeIds(viewer);
  const visibleSet = new Set(visibleIds.map(String));
  return (team.members || []).some((member) => visibleSet.has(String(member)));
};

export const getDepartmentStructure = async ({ departmentId, viewer }) => {
  const query = departmentId ? { _id: departmentId } : await scopedDepartmentQuery(viewer);
  const departments = await Department.find(query)
    .populate('manager departmentHead departmentMembers', employeeFields)
    .populate('projects', projectFields)
    .sort({ name: 1 })
    .lean();

  const departmentIds = departments.map((department) => department._id);
  const [teams, users, projects] = await Promise.all([
    Team.find({ department: { $in: departmentIds } })
      .populate('lead teamLead members', employeeFields)
      .populate('assignedProjects', projectFields)
      .sort({ name: 1 })
      .lean(),
    User.find({ department: { $in: departmentIds } })
      .populate('managerId reportingManager teamLeadId teamLead department', 'name email role designation code departmentName name')
      .sort({ hierarchyLevel: 1, name: 1 })
      .lean(),
    Project.find({ department: { $in: departmentIds }, archived: false })
      .populate('projectManager teamLeaders assignedTeam', 'name email role designation teamName name')
      .select(projectFields)
      .lean()
  ]);

  return departments.map((department) => {
    const id = String(department._id);
    const departmentTeams = teams.filter((team) => String(team.department) === id);
    const departmentUsers = users.filter((user) => String(user.department?._id || user.department) === id);
    const departmentProjects = projects.filter((project) => String(project.department) === id);
    const projectMap = new Map();
    [...(department.projects || []), ...departmentProjects].forEach((project) => {
      projectMap.set(String(project._id), project);
    });
    return {
      ...department,
      departmentName: department.departmentName || department.name,
      departmentHead: department.departmentHead || department.manager,
      members: departmentUsers,
      teams: departmentTeams,
      projects: [...projectMap.values()],
      metrics: {
        memberCount: departmentUsers.length,
        teamCount: departmentTeams.length,
        projectCount: departmentProjects.length
      }
    };
  });
};

export const listTeamsForViewer = async (viewer) => {
  const query = { active: { $ne: false } };
  if (viewer.companyId || viewer.workspace) query.workspace = viewer.companyId || viewer.workspace;
  const teams = await Team.find(query)
    .populate('lead teamLead members', employeeFields)
    .populate('department', 'name departmentName code manager departmentHead')
    .populate('assignedProjects', projectFields)
    .sort({ name: 1 });

  const visible = [];
  for (const team of teams) {
    if (await isVisibleTeam(team, viewer)) visible.push(team);
  }
  return visible;
};

export const getTeamStructure = async ({ teamId, viewer }) => {
  const team = await Team.findById(teamId)
    .populate('lead teamLead members', employeeFields)
    .populate('department', 'name departmentName code manager departmentHead')
    .populate('assignedProjects', projectFields);
  if (!team) return null;
  if (team.active === false) return null;
  if (!(await isVisibleTeam(team, viewer))) return false;

  const memberIds = team.members.map((member) => member._id);
  const workload = await Project.aggregate([
    {
      $match: {
        archived: false,
        $or: [
          { assignedTeam: new mongoose.Types.ObjectId(teamId) },
          { 'members.user': { $in: memberIds } },
          { assignedEmployees: { $in: memberIds } }
        ]
      }
    },
    { $project: { name: 1, key: 1, status: 1, color: 1, memberCount: { $size: '$members' } } },
    { $sort: { updatedAt: -1 } }
  ]);

  return { ...team.toObject(), activeProjects: workload };
};

export const assignEmployeeToDepartment = async ({ employeeId, departmentId, actor }) => {
  if (!isCompanyAdmin(actor) && !(await canManageEmployee(actor, employeeId))) {
    const error = new Error('You can only assign employees in your reporting tree');
    error.statusCode = 403;
    throw error;
  }
  const [employee, department] = await Promise.all([
    User.findById(employeeId),
    Department.findById(departmentId)
  ]);
  if (!employee || !department) throw new Error('Employee or department not found');

  await Department.updateMany({ departmentMembers: employee._id }, { $pull: { departmentMembers: employee._id } });
  employee.department = department._id;
  employee.departmentId = department._id;
  employee.companyId = department.workspace || employee.companyId;
  employee.workspace = department.workspace || employee.workspace;
  await employee.save();
  await Department.updateOne({ _id: department._id }, { $addToSet: { departmentMembers: employee._id } });
  return employee.populate('department managerId teamLeadId', 'name departmentName code email role designation');
};

export const transferEmployeeToTeam = async ({ employeeId, teamId, actor }) => {
  if (!isCompanyAdmin(actor) && !(await canManageEmployee(actor, employeeId))) {
    const error = new Error('You can only transfer employees in your reporting tree');
    error.statusCode = 403;
    throw error;
  }
  const [employee, team] = await Promise.all([User.findById(employeeId), Team.findById(teamId)]);
  if (!employee || !team) throw new Error('Employee or team not found');

  await Team.updateMany({ members: employee._id }, { $pull: { members: employee._id } });
  employee.department = team.department || employee.department;
  employee.departmentId = team.department || employee.departmentId;
  employee.teamLeadId = team.lead || team.teamLead || employee.teamLeadId;
  employee.teamLead = employee.teamLeadId;
  employee.managerId = employee.managerId || employee.teamLeadId;
  employee.reportingManager = employee.reportingManager || employee.managerId;
  employee.workspace = team.workspace || employee.workspace;
  employee.companyId = team.workspace || employee.companyId;
  await employee.save();
  await Team.updateOne({ _id: team._id }, { $addToSet: { members: employee._id } });
  if (team.department) {
    await Department.updateOne({ _id: team.department }, { $addToSet: { departmentMembers: employee._id } });
  }
  return employee.populate('department managerId teamLeadId', 'name departmentName code email role designation');
};
