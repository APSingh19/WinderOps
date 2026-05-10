import express from 'express';
import {
  createDepartment,
  deleteDepartment,
  departmentRules,
  getDepartmentDetails,
  listDepartments,
  updateDepartment
} from '../controllers/organizationController.js';
import { protect } from '../middleware/auth.js';
import { requireOrgRole } from '../middleware/hierarchyAccess.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);
router.route('/').get(listDepartments).post(requireOrgRole('Department Head', 'Department Manager'), departmentRules, validate, createDepartment);
router.route('/:departmentId').get(getDepartmentDetails).patch(requireOrgRole('Department Head', 'Department Manager'), updateDepartment).delete(requireOrgRole('Department Head', 'Department Manager'), deleteDepartment);

export default router;
