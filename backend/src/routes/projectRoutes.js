import express from 'express';
import {
  addMember,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  projectRules,
  removeMember,
  updateProjectRules,
  updateProject
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);
router.route('/').get(listProjects).post(projectRules, validate, createProject);
router.route('/:id').get(getProject).patch(updateProjectRules, validate, updateProject).delete(deleteProject);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

export default router;
