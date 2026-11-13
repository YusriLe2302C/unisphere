import { Router, Response } from 'express';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Community } from '../models/Community.js';
import { Opportunity } from '../models/Opportunity.js';
import { Report } from '../models/Report.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Submit a report (any authenticated user can report objectionable content)
router.post('/reports', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      res.status(400).json({ message: 'Target type, target ID, and reason are required.' });
      return;
    }

    const report = await Report.create({
      reporter: req.user!._id,
      targetType,
      targetId,
      reason
    });

    res.status(201).json({ message: 'Report submitted for review.', report });
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting report.', error: error.message });
  }
});

// Admin Dashboard Overview Statistics
router.get('/stats', authenticate, requireRole(['admin']), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalUsers, totalPosts, totalCommunities, totalOpportunities, totalReports] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Community.countDocuments(),
      Opportunity.countDocuments(),
      Report.countDocuments({ status: 'pending' })
    ]);

    const rolesBreakdown = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const institutionsBreakdown = await User.aggregate([
      { $group: { _id: '$institution', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalPosts,
        totalCommunities,
        totalOpportunities,
        pendingReports: totalReports,
        rolesBreakdown,
        institutionsBreakdown
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving statistics.', error: error.message });
  }
});

// Admin List Reports
router.get('/reports', authenticate, requireRole(['admin']), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'name email institution role')
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching reports.', error: error.message });
  }
});

// Admin Resolve / Update Report Status
router.put('/reports/:id', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawStatus = req.body.status || req.body.action;
    let status: 'pending' | 'resolved' | 'dismissed' = 'resolved';
    if (rawStatus === 'dismiss' || rawStatus === 'dismissed') {
      status = 'dismissed';
    } else if (rawStatus === 'resolve' || rawStatus === 'resolved') {
      status = 'resolved';
    } else if (rawStatus === 'pending') {
      status = 'pending';
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );

    if (!report) {
      res.status(404).json({ message: 'Report not found.' });
      return;
    }

    res.json({ message: `Report marked as ${status}.`, report });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating report.', error: error.message });
  }
});

// Admin Verify / Unverify User Institution Status (Supports both /users/:id/verify and /verify-user/:id)
router.put(['/users/:id/verify', '/verify-user/:id'], authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isVerified } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isVerified: Boolean(isVerified) } },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.json({ message: `User verification updated.`, user });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating user verification.', error: error.message });
  }
});

export default router;
