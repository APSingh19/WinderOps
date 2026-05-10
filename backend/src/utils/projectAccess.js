import Project from '../models/Project.js';
import { isCompanyAdmin } from '../constants/roles.js';
import { getVisibleEmployeeIds } from '../services/hierarchyService.js';

const leadershipFields = (userId) => [
  { owner: userId },
  { projectManager: userId },
  { coLeaders: userId },
  { teamLeaders: userId },
  { 'members.user': userId },
  { 'subTeams.lead': userId },
  { 'subTeams.members': userId }
];

export const buildVisibleProjectQuery = async (user) => {
  if (isCompanyAdmin(user)) return {};

  const visibleEmployeeIds = await getVisibleEmployeeIds(user);
  return {
    $or: [
      ...leadershipFields(user._id),
      { owner: { $in: visibleEmployeeIds } },
      { projectManager: { $in: visibleEmployeeIds } },
      { teamLeaders: { $in: visibleEmployeeIds } },
      { 'members.user': { $in: visibleEmployeeIds } },
      { 'subTeams.lead': { $in: visibleEmployeeIds } },
      { 'subTeams.members': { $in: visibleEmployeeIds } }
    ]
  };
};

export const getProjectForUser = async (projectId, user) => {
  const project = await Project.findById(projectId);
  if (!project) return null;

  const isGlobalAdmin = isCompanyAdmin(user);
  const isOwner = String(project.owner) === String(user._id);
  const isManager = String(project.projectManager || '') === String(user._id);
  const isLeader = [...(project.coLeaders || []), ...(project.teamLeaders || [])].some(
    (id) => String(id) === String(user._id)
  );
  const isMember = project.members.some((member) => String(member.user) === String(user._id));
  const visibleEmployeeIds = isGlobalAdmin ? null : await getVisibleEmployeeIds(user);
  const canSeeThroughHierarchy =
    visibleEmployeeIds &&
    [project.owner, project.projectManager, ...(project.teamLeaders || []), ...project.members.map((member) => member.user)]
      .filter(Boolean)
      .some((id) => visibleEmployeeIds.some((visibleId) => String(visibleId) === String(id)));

  if (!isGlobalAdmin && !isOwner && !isManager && !isLeader && !isMember && !canSeeThroughHierarchy) return false;
  return project;
};

export const canManageProject = (project, user) => {
  if (isCompanyAdmin(user)) return true;
  if (String(project.owner) === String(user._id)) return true;
  if (String(project.projectManager || '') === String(user._id)) return true;
  if ((project.coLeaders || []).some((id) => String(id) === String(user._id))) return true;
  return project.members.some(
    (member) =>
      String(member.user) === String(user._id) &&
      ['Admin', 'Owner', 'Project Manager', 'Co-Leader', 'Team Leader'].includes(member.role)
  );
};
