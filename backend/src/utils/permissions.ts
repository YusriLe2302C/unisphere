import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { PrimaryRole, ScopedResponsibility, IUser } from '../models/User.js';

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  role: PrimaryRole | 'superadmin';
  institution: string;
  collegeId?: string;
  department?: string;
  responsibilities: ScopedResponsibility[];
}

// Roles that have platform-wide authority
const PLATFORM_ADMIN_ROLES: Array<PrimaryRole | 'superadmin'> = ['admin', 'superadmin'];

// Roles with institution-scoped authority
const INSTITUTION_AUTHORITY_ROLES: Array<PrimaryRole | 'superadmin'> = ['dean', 'principal', 'admin', 'superadmin'];

// Privileged roles that cannot be self-assigned via public registration
export const PRIVILEGED_ROLES: PrimaryRole[] = ['dean', 'principal', 'admin'];

// Public registration is limited to these roles
export const PUBLIC_REGISTRATION_ROLES: PrimaryRole[] = ['student', 'faculty', 'alumni'];

const getUser = (req: Request): IUser | null => {
  return (req as any).user as IUser | undefined ?? null;
};

export const requireRoles = (allowedRoles: Array<PrimaryRole | 'superadmin'>) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getUser(req);
    if (!user) return next(new UnauthorizedError('Authentication required'));
    if (user.role === 'superadmin') return next();
    if (!allowedRoles.includes(user.role as any)) {
      return next(new ForbiddenError(
        `Action restricted. Required: [${allowedRoles.join(', ')}]. Your role: '${user.role}'`
      ));
    }
    next();
  };
};

export const requireResponsibility = (responsibility: ScopedResponsibility) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getUser(req);
    if (!user) return next(new UnauthorizedError('Authentication required'));
    if (user.role === 'superadmin' || PLATFORM_ADMIN_ROLES.includes(user.role as any)) return next();
    if (!user.responsibilities?.includes(responsibility)) {
      return next(new ForbiddenError(`Requires '${responsibility}' responsibility.`));
    }
    next();
  };
};

export const requireSameInstitution = (paramName: string = 'institution') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getUser(req);
    if (!user) return next(new UnauthorizedError('Authentication required'));
    if (user.role === 'superadmin') return next();

    const targetInstitution = req.params[paramName] || req.body[paramName] || req.query[paramName];
    if (!targetInstitution) return next();

    const userInstitution = user.institution;
    if (userInstitution.toLowerCase() !== String(targetInstitution).toLowerCase()) {
      return next(new ForbiddenError('Cross-institution access violation'));
    }
    next();
  };
};

export const requireOwnershipOrRole = (
  extractResourceOwnerId: (req: Request) => string | undefined,
  fallbackRoles: Array<PrimaryRole | 'superadmin'> = ['admin', 'superadmin']
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getUser(req);
    if (!user) return next(new UnauthorizedError('Authentication required'));
    if (user.role === 'superadmin' || fallbackRoles.includes(user.role as any)) return next();

    const ownerId = extractResourceOwnerId(req);
    if (!ownerId || ownerId.toString() !== (user._id as any).toString()) {
      return next(new ForbiddenError('Access denied: You do not own this resource'));
    }
    next();
  };
};

export const requireInstitutionAuthority = () => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getUser(req);
    if (!user) return next(new UnauthorizedError('Authentication required'));
    if (!INSTITUTION_AUTHORITY_ROLES.includes(user.role as any)) {
      return next(new ForbiddenError('Requires institution-level authority (dean, principal, or admin)'));
    }
    next();
  };
};

export const preventPrivilegeEscalation = (targetRole: PrimaryRole) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getUser(req);
    if (!user) return next(new UnauthorizedError('Authentication required'));
    if (PRIVILEGED_ROLES.includes(targetRole) && !PLATFORM_ADMIN_ROLES.includes(user.role as any)) {
      return next(new ForbiddenError(`Only admins can assign the '${targetRole}' role`));
    }
    next();
  };
};
