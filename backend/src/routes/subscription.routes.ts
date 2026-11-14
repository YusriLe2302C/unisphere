import { Router, Response } from 'express';
import { Subscription, SubscriptionTargetType } from '../models/Subscription.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET all subscriptions for authenticated user
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subscriptions = await Subscription.find({ user: req.user!._id })
      .sort({ createdAt: -1 });

    res.json({ subscriptions });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving subscriptions.', error: error.message });
  }
});

// CHECK if user is subscribed to a target
router.get('/check', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId } = req.query;
    if (!targetType || !targetId) {
      res.status(400).json({ message: 'targetType and targetId are required query parameters.' });
      return;
    }

    const sub = await Subscription.findOne({
      user: req.user!._id,
      targetType: targetType as SubscriptionTargetType,
      targetId: (targetId as string).trim()
    });

    res.json({
      isSubscribed: !!sub,
      subscription: sub || null
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error checking subscription status.', error: error.message });
  }
});

// SUBSCRIBE to a topic / community / department / researcher / etc.
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, targetName, preferences } = req.body;

    if (!targetType || !targetId) {
      res.status(400).json({ message: 'targetType and targetId are required.' });
      return;
    }

    const validTypes: SubscriptionTargetType[] = [
      'topic',
      'community',
      'department',
      'institution',
      'research_subject',
      'researcher',
      'opportunity_category'
    ];

    if (!validTypes.includes(targetType)) {
      res.status(400).json({ message: `Invalid targetType: ${targetType}` });
      return;
    }

    const cleanTargetId = targetId.toString().trim();
    const cleanTargetName = (targetName || cleanTargetId).toString().trim();

    // Upsert subscription
    const subscription = await Subscription.findOneAndUpdate(
      {
        user: req.user!._id,
        targetType,
        targetId: cleanTargetId
      },
      {
        $set: {
          targetName: cleanTargetName,
          preferences: preferences || { inAppAlerts: true, emailAlerts: false }
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      message: `Subscribed to ${cleanTargetName} successfully!`,
      subscription
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating subscription.', error: error.message });
  }
});

// TOGGLE SUBSCRIPTION
router.post('/toggle', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, targetName } = req.body;

    if (!targetType || !targetId) {
      res.status(400).json({ message: 'targetType and targetId are required.' });
      return;
    }

    const cleanTargetId = targetId.toString().trim();
    const cleanTargetName = (targetName || cleanTargetId).toString().trim();

    const existing = await Subscription.findOne({
      user: req.user!._id,
      targetType,
      targetId: cleanTargetId
    });

    if (existing) {
      await Subscription.findByIdAndDelete(existing._id);
      res.json({
        message: `Unsubscribed from ${cleanTargetName}.`,
        isSubscribed: false,
        subscription: null
      });
    } else {
      const newSub = await Subscription.create({
        user: req.user!._id,
        targetType,
        targetId: cleanTargetId,
        targetName: cleanTargetName,
        preferences: { inAppAlerts: true, emailAlerts: false }
      });
      res.json({
        message: `Subscribed to ${cleanTargetName}!`,
        isSubscribed: true,
        subscription: newSub
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Error toggling subscription.', error: error.message });
  }
});

// UPDATE PREFERENCES
router.put('/:id/preferences', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inAppAlerts, emailAlerts } = req.body;
    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      {
        $set: {
          'preferences.inAppAlerts': inAppAlerts !== undefined ? inAppAlerts : true,
          'preferences.emailAlerts': emailAlerts !== undefined ? emailAlerts : false
        }
      },
      { new: true }
    );

    if (!sub) {
      res.status(404).json({ message: 'Subscription not found.' });
      return;
    }

    res.json({ message: 'Alert preferences updated.', subscription: sub });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating preferences.', error: error.message });
  }
});

// UNSUBSCRIBE by ID
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sub = await Subscription.findOneAndDelete({
      _id: req.params.id,
      user: req.user!._id
    });

    if (!sub) {
      res.status(404).json({ message: 'Subscription not found.' });
      return;
    }

    res.json({ message: 'Unsubscribed successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting subscription.', error: error.message });
  }
});

export default router;
