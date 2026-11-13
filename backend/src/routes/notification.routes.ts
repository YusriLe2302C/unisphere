import { Router, Response } from 'express';
import { Notification } from '../models/Notification.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET notifications for current user with filtering and pagination
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, unreadOnly, page = '1', limit = '50' } = req.query;
    const filter: any = { recipient: req.user!._id };

    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('sender', 'name avatar institution role headline')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        recipient: req.user!._id,
        isRead: false
      })
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving notifications.', error: error.message });
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { recipient: req.user!._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating notifications.', error: error.message });
  }
});

// Mark single as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user!._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ message: 'Notification not found.' });
      return;
    }

    res.json({ message: 'Notification marked as read.', notification: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating notification.', error: error.message });
  }
});

// Clear all read notifications
router.delete('/clear-read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.deleteMany({
      recipient: req.user!._id,
      isRead: true
    });
    res.json({ message: 'Read alerts cleared successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error clearing read notifications.', error: error.message });
  }
});

// Delete single notification
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user!._id
    });

    if (!deleted) {
      res.status(404).json({ message: 'Notification not found.' });
      return;
    }

    res.json({ message: 'Notification deleted.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting notification.', error: error.message });
  }
});

export default router;
