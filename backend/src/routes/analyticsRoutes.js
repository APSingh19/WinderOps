import express from 'express';
import {
  dashboard,
  departmentPerformance,
  employeePerformance,
  enterpriseOverview,
  projectRisk,
  teamPerformance,
  workloadCapacity
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', protect, dashboard);
router.get('/enterprise-overview', protect, enterpriseOverview);
router.get('/departments/performance', protect, departmentPerformance);
router.get('/teams/performance', protect, teamPerformance);
router.get('/employees/performance', protect, employeePerformance);
router.get('/projects/risk', protect, projectRisk);
router.get('/workload/capacity', protect, workloadCapacity);

export default router;
