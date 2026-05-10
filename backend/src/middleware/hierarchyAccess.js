import { isCompanyAdmin, managerRoles } from '../constants/roles.js';
import { canManageEmployee } from '../services/hierarchyService.js';

export const requireOrgRole = (...roles) => (req, res, next) => {
  if (isCompanyAdmin(req.user) || roles.includes(req.user.role)) return next();
  res.status(403);
  next(new Error('You do not have hierarchy permission for this action'));
};

export const requirePeopleManager = (req, res, next) => {
  if (managerRoles.includes(req.user.role)) return next();
  res.status(403);
  next(new Error('Only managers can perform this action'));
};

export const requireCanManageEmployee = async (req, res, next) => {
  try {
    if (await canManageEmployee(req.user, req.params.employeeId || req.body.employeeId)) return next();
    res.status(403);
    next(new Error('You can only manage employees in your reporting tree'));
  } catch (error) {
    next(error);
  }
};
