import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as AuthService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';
import { writeAudit } from '../services/audit.service.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await AuthService.registerPublic(req.body);
  const userObj = user.toObject() as any;
  delete userObj.password;
  res.status(201).json({ message: 'Account created successfully.', token, user: userObj });
});

export const createAuthority = asyncHandler(async (req: AuthRequest, res: Response) => {
  const creatorRole = req.user!.role as any;
  const { user, token } = await AuthService.createAuthorityAccount(creatorRole, req.body);
  await writeAudit(req.user!, 'user.create_authority', 'User', user._id, null, { role: user.role, responsibilities: user.responsibilities, institution: user.institution }, String(req.body.reason || ''), req);
  const userObj = user.toObject() as any;
  delete userObj.password;
  res.status(201).json({ message: 'Authority account created.', token, user: userObj });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, token } = await AuthService.login(email, password);
  const userObj = user.toObject() as any;
  delete userObj.password;
  res.json({ message: 'Logged in successfully.', token, user: userObj });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  await AuthService.logout(req.user!._id.toString());
  res.json({ message: 'Logged out successfully. Token revoked.' });
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  await AuthService.verifyEmail(token);
  res.json({ message: 'Email verified successfully.' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const resetToken = await AuthService.requestPasswordReset(req.body.email);
  // In production the token is emailed; in dev/test we return it
  const isDev = process.env.NODE_ENV !== 'production';
  res.json({
    message: 'If that email exists, a reset link has been sent.',
    ...(isDev && { resetToken })
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  await AuthService.resetPassword(token, newPassword);
  res.json({ message: 'Password reset successfully. Please log in again.' });
});

export const assignRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { role, responsibilities } = req.body;
  const beforeUser = await User.findById(userId); const before = beforeUser ? { role: beforeUser.role, responsibilities: beforeUser.responsibilities } : null;
  const user = await AuthService.assignRole(req.user!._id.toString(), userId, role, responsibilities);
  await writeAudit(req.user!, 'user.role.assign', 'User', user._id, before, { role: user.role, responsibilities: user.responsibilities }, String(req.body.reason || ''), req);
  res.json({ message: 'Role assigned successfully.', user });
});

export const assignResponsibilities = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { responsibilities } = req.body;
  const beforeUser = await User.findById(userId); const before = beforeUser ? { responsibilities: beforeUser.responsibilities } : null;
  const user = await AuthService.assignResponsibilities(req.user!._id.toString(), userId, responsibilities);
  await writeAudit(req.user!, 'user.responsibilities.assign', 'User', user._id, before, { responsibilities: user.responsibilities }, String(req.body.reason || ''), req);
  res.json({ message: 'Responsibilities updated.', user });
});
