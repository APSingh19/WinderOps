import express from 'express';
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  reorderTasks,
  reviewTask,
  taskRules,
  updateTask,
  uploadAttachment
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);
router.route('/').get(listTasks).post(taskRules, validate, createTask);
router.patch('/reorder', reorderTasks);
router.patch('/:id/review', reviewTask);
router.route('/:id').get(getTask).patch(updateTask).delete(deleteTask);
router.post('/:id/attachments', upload.single('file'), uploadAttachment);

export default router;
