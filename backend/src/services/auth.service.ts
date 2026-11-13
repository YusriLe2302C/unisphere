import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser, PrimaryRole, ScopedResponsibility } from '../models/User.js';
import { getJwtSecret } from '../middleware/auth.js';
import { ConflictError, BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { PUBLIC_REGISTRATION_ROLES, PRIVILEGED_ROLES } from '../utils/permissions.js';
import { envConfig } from '../config/env.js';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: string;
  institution: string;
  department?: string;
  graduationYear?: number;
  headline?: string;
  bio?: string;
  collegeId?: string;
  batch?: string;
  semester?: number;
  degree?: string;
}

export interface AuthorityCreateInput extends RegisterInput {
  role: PrimaryRole;
  responsibilities?: ScopedResponsibility[];
}

export const generateToken = (userId: string, tokenVersion: number): string => {
  const secret = getJwtSecret();
  const expiresIn = (envConfig.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  return jwt.sign({ id: userId, ver: tokenVersion }, secret, { expiresIn });
};

const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, 12);

const isAcademicDomain = (domain: string): boolean =>
  domain.endsWith('.edu') ||
  domain.endsWith('.ac.in') ||
  domain.includes('univ') ||
  domain.includes('college') ||
  domain.includes('rnsit');

export const registerPublic = async (input: RegisterInput): Promise<{ user: IUser; token: string }> => {
  const { name, email, password, role, institution, department, graduationYear, headline, bio, collegeId, batch, semester, degree } = input;

  if (!name?.trim() || !email?.trim() || !password || !institution?.trim()) {
    throw new BadRequestError('name, email, password, and institution are required');
  }

  const chosenRole = ((role || 'student').toLowerCase()) as PrimaryRole;
  if (!PUBLIC_REGISTRATION_ROLES.includes(chosenRole)) {
    throw new BadRequestError(`Public registration only allows: ${PUBLIC_REGISTRATION_ROLES.join(', ')}`);
  }

  if (password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new ConflictError('An account with this email already exists');

  const emailDomain = normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : '';
  const autoVerified = isAcademicDomain(emailDomain);

  let verificationToken: string | undefined;
  let verificationExpires: Date | undefined;
  if (envConfig.EMAIL_VERIFICATION_REQUIRED && !autoVerified) {
    verificationToken = crypto.randomBytes(32).toString('hex');
    verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: await hashPassword(password),
    role: chosenRole,
    institution: institution.trim(),
    institutionDomain: emailDomain,
    isVerified: autoVerified || !envConfig.EMAIL_VERIFICATION_REQUIRED,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
    department: department?.trim() || 'General',
    graduationYear: graduationYear ? Number(graduationYear) : undefined,
    headline: headline?.trim() || `${chosenRole} at ${institution}`,
    bio: bio?.trim() || '',
    collegeId: collegeId?.trim(),
    batch: batch?.trim(),
    semester: semester ? Number(semester) : undefined,
    degree: degree || undefined,
    tokenVersion: 0
  });

  const token = generateToken(user._id.toString(), user.tokenVersion);
  return { user, token };
};

export const createAuthorityAccount = async (
  creatorRole: PrimaryRole | 'superadmin',
  input: AuthorityCreateInput
): Promise<{ user: IUser; token: string }> => {
  const { name, email, password, role, institution, department, responsibilities } = input;

  if (!name?.trim() || !email?.trim() || !password || !institution?.trim()) {
    throw new BadRequestError('name, email, password, and institution are required');
  }

  // Only admin/superadmin can create privileged accounts
  if (PRIVILEGED_ROLES.includes(role) && creatorRole !== 'admin' && creatorRole !== 'superadmin') {
    throw new BadRequestError(`Only admins can create '${role}' accounts`);
  }

  if (password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new ConflictError('An account with this email already exists');

  const emailDomain = normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : '';

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: await hashPassword(password),
    role,
    responsibilities: responsibilities || [],
    institution: institution.trim(),
    institutionDomain: emailDomain,
    isVerified: true,
    department: department?.trim() || 'Administration',
    tokenVersion: 0
  });

  const token = generateToken(user._id.toString(), user.tokenVersion);
  return { user, token };
};

export const login = async (email: string, password: string): Promise<{ user: IUser; token: string }> => {
  if (!email || !password) throw new BadRequestError('Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) throw new UnauthorizedError('Invalid email or password');

  if (!user.isActive || user.disciplinaryStatus === 'suspended') {
    throw new UnauthorizedError('Account is suspended. Contact your institution administrator.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new UnauthorizedError('Invalid email or password');

  const token = generateToken(user._id.toString(), user.tokenVersion);
  return { user, token };
};

export const logout = async (userId: string): Promise<void> => {
  // Increment tokenVersion to invalidate all existing tokens
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
};

export const verifyEmail = async (token: string): Promise<void> => {
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) throw new BadRequestError('Invalid or expired verification token');

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
};

export const requestPasswordReset = async (email: string): Promise<string> => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // Always return success to prevent email enumeration
  if (!user) return 'If that email exists, a reset link has been sent';

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await user.save();

  // In production, send email here via SMTP. Token returned for dev/test.
  return resetToken;
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  if (!newPassword || newPassword.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters');
  }

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() }
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw new BadRequestError('Invalid or expired reset token');

  user.password = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Revoke all existing tokens
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
};

export const assignRole = async (
  adminId: string,
  targetUserId: string,
  newRole: PrimaryRole,
  responsibilities?: ScopedResponsibility[]
): Promise<IUser> => {
  const admin = await User.findById(adminId);
  if (!admin || !['admin','superadmin','dean','principal'].includes(admin.role)) {
    throw new BadRequestError('Institution authority required');
  }

  if (PRIVILEGED_ROLES.includes(newRole) && admin.role !== 'admin' && admin.role !== 'superadmin') {
    throw new BadRequestError(`Only admins can assign the '${newRole}' role`);
  }

  const target = await User.findById(targetUserId);
  if (!target) throw new NotFoundError('Target user not found');

  // Prevent cross-institution role assignment (unless superadmin)
  if (admin.role !== 'admin' && admin.role !== 'superadmin' && admin.institution !== target.institution || admin.role === 'admin' && admin.institution !== target.institution) {
    throw new BadRequestError('Cannot assign roles to users from a different institution');
  }

  const updates: any = { role: newRole };
  if (responsibilities !== undefined) updates.responsibilities = responsibilities;

  const updated = await User.findByIdAndUpdate(targetUserId, { $set: updates }, { new: true }).select('-password');
  return updated!;
};

export const assignResponsibilities = async (
  adminId: string,
  targetUserId: string,
  responsibilities: ScopedResponsibility[]
): Promise<IUser> => {
  const admin = await User.findById(adminId);
  if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin' && admin.role !== 'dean' && admin.role !== 'principal')) {
    throw new BadRequestError('Insufficient authority to assign responsibilities');
  }

  const target = await User.findById(targetUserId);
  if (!target) throw new NotFoundError('Target user not found');

  if (admin.role !== 'superadmin' && admin.institution !== target.institution) {
    throw new BadRequestError('Cannot assign responsibilities to users from a different institution');
  }

  const updated = await User.findByIdAndUpdate(
    targetUserId,
    { $set: { responsibilities } },
    { new: true }
  ).select('-password');
  return updated!;
};
