import express from 'express';
import { addComment, commentRules, deleteComment, listComments } from '../controllers/commentController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);
router.get('/task/:taskId', listComments);
router.post('/task/:taskId', commentRules, validate, addComment);
router.delete('/:id', deleteComment);

export default router;
