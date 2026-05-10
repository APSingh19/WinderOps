import express from 'express';
import {
  createDueSoonNotifications,
  listNotifications,
  markRead
} from '../controllers/notificationController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', listNotifications);
router.patch('/read', markRead);
router.post('/due-soon', authorize('Admin'), createDueSoonNotifications);

export default router;
