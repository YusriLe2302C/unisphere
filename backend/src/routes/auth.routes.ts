import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateAuthorityCreate,
  validateRoleAssignment
} from '../validators/auth.validator.js';
import * as AuthController from '../controllers/auth.controller.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again in 15 minutes.' }
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 1 hour.' }
});

// Public registration — student, faculty, alumni only
router.post('/register', authLimiter, validateRegister, AuthController.register);

// Login
router.post('/login', authLimiter, validateLogin, AuthController.login);

// Logout (revokes token via tokenVersion increment)
router.post('/logout', authenticate, AuthController.logout);

// Current user
router.get('/me', authenticate, AuthController.me);

// Email verification
router.get('/verify-email/:token', AuthController.verifyEmail);

// Password reset flow
router.post('/forgot-password', strictLimiter, AuthController.forgotPassword);
router.post('/reset-password', strictLimiter, validatePasswordReset, AuthController.resetPassword);

// Admin: create authority accounts (dean, principal, admin, faculty, etc.)
router.post(
  '/create-authority',
  authenticate,
  requireRole(['admin', 'superadmin']),
  validateAuthorityCreate,
  AuthController.createAuthority
);

// Admin: assign primary role to existing user
router.put(
  '/users/:userId/role',
  authenticate,
  requireRole(['admin', 'superadmin','dean','principal']),
  validateRoleAssignment,
  AuthController.assignRole
);

// Admin/Dean/Principal: assign scoped responsibilities (no new account created)
router.put(
  '/users/:userId/responsibilities',
  authenticate,
  requireRole(['admin', 'superadmin', 'dean', 'principal']),
  AuthController.assignResponsibilities
);

// Demo login (dev/test only)
router.post('/demo-login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ message: 'Demo login disabled in production.' });
    return;
  }
  const { User } = await import('../models/User.js');
  const { generateToken } = await import('../services/auth.service.js');
  const { role } = req.body;
  const targetRole = role || 'student';
  const user = await User.findOne({ role: targetRole });
  if (!user) {
    res.status(404).json({ message: `No demo account for role: ${targetRole}. Run seed script.` });
    return;
  }
  const token = generateToken(user._id.toString(), user.tokenVersion);
  const userObj = user.toObject() as any;
  delete userObj.password;
  res.json({ message: `Demo login as ${targetRole}`, token, user: userObj });
});

export default router;
