import { body } from 'express-validator';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { signToken } from '../utils/tokens.js';
import { normalizeRole } from '../constants/roles.js';

export const signupRules = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

export const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const authResponse = (user) => ({
  user,
  token: signToken(user._id)
});

export const signup = asyncHandler(async (req, res) => {
  const existing = await User.findOne({ email: req.body.email });
  if (existing) {
    res.status(409);
    throw new Error('Email is already registered');
  }

  const isFirstUser = (await User.countDocuments()) === 0;
  const role = isFirstUser ? 'Super Admin' : normalizeRole(req.body.role);
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role,
    title: req.body.title || (role === 'Super Admin' ? 'Company Admin' : 'Team Member'),
    designation: req.body.designation || (role === 'Super Admin' ? 'CEO/Admin' : undefined)
  });
  res.status(201).json(authResponse(user));
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json(authResponse(user));
});

export const me = asyncHandler(async (req, res) => {
  res.json(req.user);
});
