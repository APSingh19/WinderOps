import express from 'express';
import { login, loginRules, me, signup, signupRules } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post('/signup', signupRules, validate, signup);
router.post('/login', loginRules, validate, login);
router.get('/me', protect, me);
router.post('/logout', protect, (req, res) => res.json({ message: 'Logged out' }));

export default router;
