import express from 'express';
import {
  createSavedFilter,
  deleteSavedFilter,
  listSavedFilters,
  savedFilterRules
} from '../controllers/savedFilterController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);
router.route('/').get(listSavedFilters).post(savedFilterRules, validate, createSavedFilter);
router.delete('/:id', deleteSavedFilter);

export default router;
