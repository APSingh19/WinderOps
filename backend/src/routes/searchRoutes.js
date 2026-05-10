import express from 'express';
import { globalSearch, listSavedFilters, saveFilter } from '../controllers/searchController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', globalSearch);
router.route('/filters').get(listSavedFilters).post(saveFilter);

export default router;
