import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as UserController from '../controllers/user.controller.js';

const router = Router();

// Search / discover users
router.get('/', UserController.searchUsers);

// Get profile by ID
router.get('/:id', UserController.getProfile);

// Update own profile
router.put('/profile/me', authenticate, UserController.updateProfile);

// Projects
router.post('/projects', authenticate, UserController.addProject);
router.delete('/projects/:projectId', authenticate, UserController.removeProject);

// Achievements
router.post('/achievements', authenticate, UserController.addAchievement);

// Follow / unfollow
router.post('/:id/follow', authenticate, UserController.toggleFollow);

// Account status management (admin / dean / principal)
router.put(
  '/:id/status',
  authenticate,
  requireRole(['admin', 'superadmin', 'dean', 'principal']),
  UserController.setAccountStatus
);

export default router;
