import { User, IUser, PrimaryRole } from '../models/User.js';
import { Post } from '../models/Post.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

const escapeRegex = (s: string) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

export const getProfile = async (userId: string): Promise<object> => {
  const user = await User.findById(userId)
    .select('-password -emailVerificationToken -passwordResetToken')
    .populate('followers', 'name avatar institution role')
    .populate('following', 'name avatar institution role');

  if (!user) throw new NotFoundError('User not found');

  const postsCount = await Post.countDocuments({ author: user._id });
  return {
    user,
    stats: {
      postsCount,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      projectsCount: user.projects.length,
      achievementsCount: user.achievements.length
    }
  };
};

const SAFE_UPDATE_FIELDS = [
  'name', 'headline', 'bio', 'department', 'graduationYear',
  'skills', 'interests', 'avatar', 'notificationPreferences',
  'privacySettings', 'batch', 'semester', 'section', 'cgpa', 'degree'
];

export const updateProfile = async (userId: string, body: any): Promise<IUser> => {
  const updates: any = {};

  for (const field of SAFE_UPDATE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // Prevent sensitive field tampering
  delete updates.role;
  delete updates.responsibilities;
  delete updates.password;
  delete updates.email;
  delete updates.isVerified;
  delete updates.isActive;
  delete updates.tokenVersion;
  delete updates.disciplinaryStatus;

  const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true })
    .select('-password -emailVerificationToken -passwordResetToken');

  if (!user) throw new NotFoundError('User not found');
  return user;
};

export const searchUsers = async (query: {
  q?: string;
  institution?: string;
  role?: string;
  skill?: string;
  department?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: IUser[]; total: number }> => {
  const filter: any = { isActive: true };

  if (query.q?.trim()) {
    const escaped = escapeRegex(query.q.trim());
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { headline: { $regex: escaped, $options: 'i' } },
      { department: { $regex: escaped, $options: 'i' } }
    ];
  }
  if (query.institution?.trim()) {
    filter.institution = { $regex: escapeRegex(query.institution.trim()), $options: 'i' };
  }
  if (query.role?.trim()) filter.role = query.role.trim();
  if (query.skill?.trim()) {
    filter.skills = { $in: [new RegExp(escapeRegex(query.skill.trim()), 'i')] };
  }
  if (query.department?.trim()) {
    filter.department = { $regex: escapeRegex(query.department.trim()), $options: 'i' };
  }

  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, query.limit || 20);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter).select('-password -emailVerificationToken -passwordResetToken').skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(filter)
  ]);

  return { users, total };
};

export const toggleFollow = async (currentUserId: string, targetUserId: string): Promise<{ isFollowing: boolean }> => {
  if (currentUserId === targetUserId) throw new BadRequestError('Cannot follow yourself');

  const [current, target] = await Promise.all([
    User.findById(currentUserId),
    User.findById(targetUserId)
  ]);

  if (!current || !target) throw new NotFoundError('User not found');

  const isFollowing = current.following.some(id => id.toString() === targetUserId);

  if (isFollowing) {
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } }),
      User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } })
    ]);
    return { isFollowing: false };
  } else {
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, { $addToSet: { following: target._id } }),
      User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: current._id } })
    ]);
    return { isFollowing: true };
  }
};

export const setAccountStatus = async (
  adminId: string,
  targetUserId: string,
  isActive: boolean,
  disciplinaryStatus?: string
): Promise<IUser> => {
  const admin = await User.findById(adminId);
  if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin' && admin.role !== 'dean' && admin.role !== 'principal')) {
    throw new ForbiddenError('Insufficient authority');
  }

  const target = await User.findById(targetUserId);
  if (!target) throw new NotFoundError('User not found');

  if (admin.role !== 'superadmin' && admin.institution !== target.institution) {
    throw new ForbiddenError('Cross-institution account management not permitted');
  }

  const updates: any = { isActive };
  if (disciplinaryStatus) updates.disciplinaryStatus = disciplinaryStatus;

  const updated = await User.findByIdAndUpdate(targetUserId, { $set: updates }, { new: true }).select('-password');
  return updated!;
};

export const addProject = async (userId: string, project: { title: string; description: string; link?: string; tags?: string[] }): Promise<IUser> => {
  if (!project.title || !project.description) throw new BadRequestError('title and description are required');
  const user = await User.findByIdAndUpdate(
    userId,
    { $push: { projects: { $each: [project], $position: 0 } } },
    { new: true }
  ).select('-password');
  if (!user) throw new NotFoundError('User not found');
  return user;
};

export const removeProject = async (userId: string, projectId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  user.projects = user.projects.filter((p: any) => p._id?.toString() !== projectId);
  await user.save();
  return user;
};

export const addAchievement = async (userId: string, achievement: { title: string; issuer?: string; year?: number; description?: string }): Promise<IUser> => {
  if (!achievement.title) throw new BadRequestError('title is required');
  const user = await User.findByIdAndUpdate(
    userId,
    { $push: { achievements: { $each: [achievement], $position: 0 } } },
    { new: true }
  ).select('-password');
  if (!user) throw new NotFoundError('User not found');
  return user;
};
