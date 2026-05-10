import express from 'express';
import {
  createUser,
  createUserRules,
  deleteUser,
  getUserProfile,
  listUsers,
  updateUser,
  updateUserRules,
  updateProfile,
  updateProfileRules
} from '../controllers/userController.js';
import { authorize, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);
router
  .route('/')
  .get(listUsers)
  .post(authorize('Super Admin', 'Admin', 'Department Manager', 'Team Leader'), createUserRules, validate, createUser);
router.patch('/me/profile', updateProfileRules, validate, updateProfile);
router.route('/:id').get(getUserProfile).patch(authorize('Super Admin', 'Admin', 'Department Manager', 'Team Leader'), updateUserRules, validate, updateUser).delete(authorize('Super Admin', 'Admin'), deleteUser);

export default router;
