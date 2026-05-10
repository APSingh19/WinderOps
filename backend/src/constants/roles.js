export const organizationRoles = [
  'Super Admin',
  'Admin',
  'Department Head',
  'Department Manager',
  'Team Leader',
  'Senior Employee',
  'Employee',
  'Member',
  'Intern'
];

export const roleLevels = {
  'Super Admin': 0,
  Admin: 1,
  'Department Head': 2,
  'Department Manager': 2,
  'Team Leader': 3,
  'Senior Employee': 4,
  Employee: 5,
  Member: 5,
  Intern: 6
};

export const managerRoles = ['Super Admin', 'Admin', 'Department Head', 'Department Manager', 'Team Leader'];

export const isCompanyAdmin = (user) => ['Super Admin', 'Admin'].includes(user?.role);

export const canManagePeople = (user) => managerRoles.includes(user?.role);

export const normalizeRole = (role) => (organizationRoles.includes(role) ? role : 'Employee');
