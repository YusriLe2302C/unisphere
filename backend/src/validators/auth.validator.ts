import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors.js';
import { PrimaryRole, ScopedResponsibility } from '../models/User.js';

const ALL_RESPONSIBILITIES: ScopedResponsibility[] = [
  'proctor', 'project_guide', 'rnd_staff', 'placement_coordinator', 'club_advisor', 'timetable_coordinator'
];

const ALL_PRIMARY_ROLES: PrimaryRole[] = ['student', 'alumni', 'faculty', 'dean', 'principal', 'admin'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegister = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { name, email, password, institution } = req.body;
    if (!name?.trim()) return next(new BadRequestError('name is required'));
    if (!email?.trim() || !EMAIL_RE.test(email)) return next(new BadRequestError('Valid email is required'));
    if (!password || password.length < 8) return next(new BadRequestError('Password must be at least 8 characters'));
    if (!institution?.trim()) return next(new BadRequestError('institution is required'));
    next();
  } catch (e) { next(e); }
};

export const validateLogin = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !EMAIL_RE.test(email)) return next(new BadRequestError('Valid email is required'));
    if (!password) return next(new BadRequestError('password is required'));
    next();
  } catch (e) { next(e); }
};

export const validatePasswordReset = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { token, newPassword } = req.body;
    if (!token?.trim()) return next(new BadRequestError('Reset token is required'));
    if (!newPassword || newPassword.length < 8) return next(new BadRequestError('New password must be at least 8 characters'));
    next();
  } catch (e) { next(e); }
};

export const validateAuthorityCreate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { name, email, password, institution, role, responsibilities } = req.body;
    if (!name?.trim()) return next(new BadRequestError('name is required'));
    if (!email?.trim() || !EMAIL_RE.test(email)) return next(new BadRequestError('Valid email is required'));
    if (!password || password.length < 8) return next(new BadRequestError('Password must be at least 8 characters'));
    if (!institution?.trim()) return next(new BadRequestError('institution is required'));
    if (!role || !ALL_PRIMARY_ROLES.includes(role)) {
      return next(new BadRequestError(`role must be one of: ${ALL_PRIMARY_ROLES.join(', ')}`));
    }
    if (responsibilities !== undefined) {
      if (!Array.isArray(responsibilities)) return next(new BadRequestError('responsibilities must be an array'));
      const invalid = (responsibilities as string[]).filter(r => !ALL_RESPONSIBILITIES.includes(r as ScopedResponsibility));
      if (invalid.length) return next(new BadRequestError(`Invalid responsibilities: ${invalid.join(', ')}`));
    }
    next();
  } catch (e) { next(e); }
};

export const validateRoleAssignment = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { role, responsibilities } = req.body;
    if (!role || !ALL_PRIMARY_ROLES.includes(role)) {
      return next(new BadRequestError(`role must be one of: ${ALL_PRIMARY_ROLES.join(', ')}`));
    }
    if (responsibilities !== undefined) {
      if (!Array.isArray(responsibilities)) return next(new BadRequestError('responsibilities must be an array'));
      const invalid = (responsibilities as string[]).filter(r => !ALL_RESPONSIBILITIES.includes(r as ScopedResponsibility));
      if (invalid.length) return next(new BadRequestError(`Invalid responsibilities: ${invalid.join(', ')}`));
    }
    next();
  } catch (e) { next(e); }
};
