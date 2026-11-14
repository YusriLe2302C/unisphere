import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as UserService from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await UserService.getProfile(req.params.id);
  res.json(data);
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await UserService.updateProfile(req.user!._id.toString(), req.body);
  res.json({ message: 'Profile updated.', user });
});

export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const { q, institution, role, skill, department, page, limit } = req.query as any;
  const result = await UserService.searchUsers({ q, institution, role, skill, department, page: Number(page), limit: Number(limit) });
  res.json(result);
});

export const toggleFollow = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await UserService.toggleFollow(req.user!._id.toString(), req.params.id);
  res.json(result);
});

export const addProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await UserService.addProject(req.user!._id.toString(), req.body);
  res.status(201).json({ message: 'Project added.', projects: user.projects });
});

export const removeProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await UserService.removeProject(req.user!._id.toString(), req.params.projectId);
  res.json({ message: 'Project removed.', projects: user.projects });
});

export const addAchievement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await UserService.addAchievement(req.user!._id.toString(), req.body);
  res.status(201).json({ message: 'Achievement added.', achievements: user.achievements });
});

export const setAccountStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isActive, disciplinaryStatus } = req.body;
  const user = await UserService.setAccountStatus(
    req.user!._id.toString(),
    req.params.id,
    Boolean(isActive),
    disciplinaryStatus
  );
  res.json({ message: 'Account status updated.', user });
});
