import express from 'express';
import {
  createWorkspace,
  getWorkspace,
  inviteWorkspaceMember,
  listWorkspaces,
  updateWorkspaceSettings,
  workspaceRules
} from '../controllers/workspaceController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);
router.route('/').get(listWorkspaces).post(workspaceRules, validate, createWorkspace);
router.route('/:id').get(getWorkspace).patch(updateWorkspaceSettings);
router.post('/:id/invites', inviteWorkspaceMember);

export default router;
