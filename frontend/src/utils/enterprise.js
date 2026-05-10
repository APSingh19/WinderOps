export const getName = (item) => item?.departmentName || item?.teamName || item?.name || 'Unassigned';

export const roleGroups = {
  company: ['Super Admin', 'Admin'],
  department: ['Department Head', 'Department Manager'],
  team: ['Team Leader'],
  employee: ['Senior Employee', 'Employee', 'Intern']
};

export const canManageOrg = (role) => [...roleGroups.company, ...roleGroups.department].includes(role);

export const buildDepartmentMetrics = (department) => {
  const members = department?.members || department?.departmentMembers || [];
  const teams = department?.teams || [];
  const projects = department?.projects || [];
  const memberCount = department?.metrics?.memberCount ?? members.length;
  const teamCount = department?.metrics?.teamCount ?? teams.length;
  const projectCount = department?.metrics?.projectCount ?? projects.length;
  const completion = Math.min(98, Math.max(44, 52 + teamCount * 7 + projectCount * 4));
  const velocity = Math.min(96, Math.max(38, 48 + memberCount * 2));
  const risk = Math.max(4, Math.min(42, 30 - teamCount * 2 + projectCount));

  return { memberCount, teamCount, projectCount, completion, velocity, risk };
};

export const departmentPalette = ['#2563eb', '#0f766e', '#be185d', '#f97316', '#475569', '#0891b2', '#7c3aed'];
