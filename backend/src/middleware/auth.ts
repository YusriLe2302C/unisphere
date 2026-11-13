import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, PrimaryRole } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET is missing or too short');
  }
  return secret;
};

export interface JwtPayload {
  id: string;
  ver: number;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await User.findById(decoded.id).select('-password -emailVerificationToken -passwordResetToken');
    if (!user) {
      res.status(401).json({ message: 'User belonging to this token no longer exists.' });
      return;
    }

    // Token revocation via tokenVersion
    if (decoded.ver !== user.tokenVersion) {
      res.status(401).json({ message: 'Token has been revoked. Please log in again.' });
      return;
    }

    // Block suspended / deactivated users
    if (!user.isActive || user.disciplinaryStatus === 'suspended') {
      res.status(403).json({ message: 'Account is suspended. Contact your institution administrator.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
};

export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret) as JwtPayload;
      const user = await User.findById(decoded.id).select('-password -emailVerificationToken -passwordResetToken');
      if (user && user.isActive && user.disciplinaryStatus !== 'suspended' && decoded.ver === user.tokenVersion) {
        req.user = user;
      }
    }
  } catch {
    // Ignore on optional auth
  }
  next();
};

export const requireRole = (roles: Array<PrimaryRole | 'superadmin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    if (req.user.role === 'superadmin') return next();
    if (!roles.includes(req.user.role as any)) {
      res.status(403).json({
        message: `Forbidden: requires one of [${roles.join(', ')}]. Your role: ${req.user.role}.`
      });
      return;
    }
    next();
  };
};
