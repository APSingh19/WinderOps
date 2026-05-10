import express from 'express';
import {
  assignDepartment,
  assignEmployeeManager,
  createDepartment,
  createTeam,
  deleteDepartment,
  deleteTeam,
  departmentAssignmentRules,
  departmentRules,
  getCompanyStructure,
  getDepartmentDetails,
  getMyReportingChain,
  getOrganizationTree,
  getSubordinates,
  getTeamDetails,
  hierarchyDashboard,
  listDepartments,
  listTeams,
  managerRules,
  teamRules,
  teamTransferRules,
  transferTeam,
  updateDepartment,
  updateTeam,
  updateEmployeeRole
} from '../controllers/organizationController.js';
import { protect } from '../middleware/auth.js';
import { requireCanManageEmployee, requireOrgRole, requirePeopleManager } from '../middleware/hierarchyAccess.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);
router.get('/tree', getOrganizationTree);
router.get('/structure', getCompanyStructure);
router.get('/dashboard', hierarchyDashboard);
router.get('/departments', listDepartments);
router.post('/departments', requireOrgRole('Department Head', 'Department Manager'), departmentRules, validate, createDepartment);
router.patch('/departments/:departmentId', requireOrgRole('Department Head', 'Department Manager'), updateDepartment);
router.delete('/departments/:departmentId', requireOrgRole('Department Head', 'Department Manager'), deleteDepartment);
router.get('/departments/:departmentId/structure', getDepartmentDetails);
router.get('/teams', listTeams);
router.post('/teams', requireOrgRole('Department Head', 'Department Manager', 'Team Leader'), teamRules, validate, createTeam);
router.patch('/teams/:teamId', requireOrgRole('Department Head', 'Department Manager', 'Team Leader'), updateTeam);
router.delete('/teams/:teamId', requireOrgRole('Department Head', 'Department Manager', 'Team Leader'), deleteTeam);
router.get('/teams/:teamId/structure', getTeamDetails);
router.get('/subordinates/:managerId?', requirePeopleManager, getSubordinates);
router.get('/reporting-chain/:userId?', getMyReportingChain);
router.patch('/assign-manager', requirePeopleManager, managerRules, validate, assignEmployeeManager);
router.patch('/assign-department', requirePeopleManager, departmentAssignmentRules, validate, assignDepartment);
router.patch('/transfer-team', requirePeopleManager, teamTransferRules, validate, transferTeam);
router.patch('/employees/:employeeId', requirePeopleManager, requireCanManageEmployee, updateEmployeeRole);

export default router;
