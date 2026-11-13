import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Notification } from '../models/Notification.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// Discover / Search Users across institutions
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, institution, role, skill } = req.query;
    const filter: any = {};

    if (query && typeof query === 'string' && query.trim()) {
      const escaped = escapeRegex(query.trim());
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { headline: { $regex: escaped, $options: 'i' } },
        { department: { $regex: escaped, $options: 'i' } }
      ];
    }

    if (institution && typeof institution === 'string' && institution.trim()) {
      filter.institution = { $regex: escapeRegex(institution.trim()), $options: 'i' };
    }

    if (role && typeof role === 'string' && role.trim()) {
      filter.role = role.trim();
    }

    if (skill && typeof skill === 'string' && skill.trim()) {
      filter.skills = { $in: [new RegExp(escapeRegex(skill.trim()), 'i')] };
    }

    const users = await User.find(filter)
      .select('-password')
      .limit(30)
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving users.', error: error.message });
  }
});

// Get User Profile with stats
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'name avatar institution role')
      .populate('following', 'name avatar institution role');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const postsCount = await Post.countDocuments({ author: user._id });

    res.json({
      user,
      stats: {
        postsCount,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        projectsCount: user.projects.length,
        achievementsCount: user.achievements.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching profile.', error: error.message });
  }
});

// Update Authenticated User Profile
router.put('/profile/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, headline, bio, department, graduationYear, skills, interests, avatar, notificationPreferences } = req.body;
    
    // Strict whitelist: only non-sensitive profile fields allowed
    const safeUpdates: any = {};
    if (typeof name === 'string' && name.trim()) safeUpdates.name = name.trim();
    if (typeof headline === 'string') safeUpdates.headline = headline.trim();
    if (typeof bio === 'string') safeUpdates.bio = bio.trim();
    if (typeof department === 'string') safeUpdates.department = department.trim();
    if (graduationYear !== undefined && !isNaN(Number(graduationYear))) safeUpdates.graduationYear = Number(graduationYear);
    if (Array.isArray(skills)) safeUpdates.skills = skills.map(s => String(s).trim()).filter(Boolean);
    if (Array.isArray(interests)) safeUpdates.interests = interests.map(i => String(i).trim()).filter(Boolean);
    if (typeof avatar === 'string' && avatar.trim()) safeUpdates.avatar = avatar.trim();
    if (notificationPreferences && typeof notificationPreferences === 'object') {
      safeUpdates.notificationPreferences = {
        inAppAlerts: notificationPreferences.inAppAlerts !== undefined ? Boolean(notificationPreferences.inAppAlerts) : true,
        opportunityAlerts: notificationPreferences.opportunityAlerts !== undefined ? Boolean(notificationPreferences.opportunityAlerts) : true,
        eventAlerts: notificationPreferences.eventAlerts !== undefined ? Boolean(notificationPreferences.eventAlerts) : true,
        researchAlerts: notificationPreferences.researchAlerts !== undefined ? Boolean(notificationPreferences.researchAlerts) : true,
        communityAlerts: notificationPreferences.communityAlerts !== undefined ? Boolean(notificationPreferences.communityAlerts) : true
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user!._id,
      { $set: safeUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully.', user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating profile.', error: error.message });
  }
});

// Add Portfolio Project
router.post('/projects', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, link, tags } = req.body;
    if (!title || !description) {
      res.status(400).json({ message: 'Project title and description are required.' });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.projects.unshift({ title, description, link, tags: tags || [] });
    await user.save();

    res.status(201).json({ message: 'Project added to portfolio.', projects: user.projects });
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding project.', error: error.message });
  }
});

// Delete Portfolio Project
router.delete('/projects/:projectId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.projects = user.projects.filter(
      (p: any) => p._id.toString() !== req.params.projectId
    );
    await user.save();

    res.json({ message: 'Project removed.', projects: user.projects });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting project.', error: error.message });
  }
});

// Add Achievement
router.post('/achievements', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, issuer, year, description } = req.body;
    if (!title) {
      res.status(400).json({ message: 'Achievement title is required.' });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.achievements.unshift({ title, issuer, year: year ? Number(year) : undefined, description });
    await user.save();

    res.status(201).json({ message: 'Achievement added.', achievements: user.achievements });
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding achievement.', error: error.message });
  }
});

// Follow / Unfollow Toggle
router.post('/:id/follow', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user!._id;

    if (targetUserId === currentUserId.toString()) {
      res.status(400).json({ message: 'You cannot follow yourself.' });
      return;
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const isFollowing = currentUser.following.some(id => id.toString() === targetUserId);

    if (isFollowing) {
      // Atomic Unfollow
      await Promise.all([
        User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } }),
        User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } })
      ]);

      res.json({ message: `Unfollowed ${targetUser.name}.`, isFollowing: false });
    } else {
      // Atomic Follow
      await Promise.all([
        User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUser._id } }),
        User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUser._id } })
      ]);

      // Trigger In-App Notification
      await Notification.create({
        recipient: targetUser._id,
        sender: currentUser._id,
        type: 'follow',
        message: `${currentUser.name} (${currentUser.institution}) started following you.`
      });

      res.json({ message: `Now following ${targetUser.name}.`, isFollowing: true });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Error processing follow request.', error: error.message });
  }
});

export default router;
