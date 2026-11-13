import { Router, Request, Response } from 'express';
import { Opportunity } from '../models/Opportunity.js';
import { Notification } from '../models/Notification.js';
import { DeliveryService } from '../services/delivery.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// GET all opportunities with filtering
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, search, location } = req.query;
    const filter: any = {};

    if (type && type !== 'All') {
      filter.type = type;
    }

    if (location && typeof location === 'string' && location.trim()) {
      filter.location = { $regex: escapeRegex(location.trim()), $options: 'i' };
    }

    if (search && typeof search === 'string' && search.trim()) {
      const escaped = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { organization: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } }
      ];
    }

    const opportunities = await Opportunity.find(filter)
      .populate('postedBy', 'name avatar institution role')
      .sort({ createdAt: -1 });

    res.json({ opportunities });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving opportunities.', error: error.message });
  }
});

// GET single opportunity
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('postedBy', 'name avatar institution role email');

    if (!opportunity) {
      res.status(404).json({ message: 'Opportunity not found.' });
      return;
    }

    res.json({ opportunity });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching opportunity.', error: error.message });
  }
});

// POST new opportunity
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, organization, institution, type, location, description, requirements, skillsRequired, deadline, applyUrl, applicationQuestions, community } = req.body;

    if (!title || !organization || !description) {
      res.status(400).json({ message: 'Title, organization, and description are required.' });
      return;
    }

    const reqsList = Array.isArray(requirements) 
      ? requirements 
      : Array.isArray(skillsRequired) 
        ? skillsRequired 
        : [];

    const questionsList = Array.isArray(applicationQuestions)
      ? applicationQuestions.map((q: string) => q.trim()).filter(Boolean)
      : [];

    const newOpp = await Opportunity.create({
      title: title.trim(),
      organization: organization.trim(),
      institution: institution || req.user!.institution,
      type: type || 'Internship',
      location: location || 'Remote',
      description: description.trim(),
      requirements: reqsList,
      applicationQuestions: questionsList,
      community: community || null,
      deadline: deadline || '',
      applyUrl: applyUrl || '',
      postedBy: req.user!._id
    });

    const populated = await Opportunity.findById(newOpp._id)
      .populate('postedBy', 'name avatar institution role')
      .populate('community', 'name slug avatar');

    // Notify opportunity category subscribers
    await DeliveryService.deliverContentNotification({
      targets: [
        { targetType: 'opportunity_category', targetId: newOpp.type }
      ],
      senderId: req.user!._id,
      type: 'opportunity',
      entityId: newOpp._id.toString(),
      message: `🎯 New ${newOpp.type}: "${newOpp.title}" at ${newOpp.organization}`,
      institution: newOpp.institution,
      communityId: newOpp.community || undefined
    });

    res.status(201).json({ message: 'Opportunity published successfully.', opportunity: populated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating opportunity.', error: error.message });
  }
});

// DELETE opportunity
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      res.status(404).json({ message: 'Opportunity not found.' });
      return;
    }

    if (opportunity.postedBy.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden: You can only delete your own listings.' });
      return;
    }

    await Opportunity.findByIdAndDelete(opportunity._id);
    res.json({ message: 'Opportunity deleted.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting opportunity.', error: error.message });
  }
});

// APPLY to Opportunity / Register Candidacy
router.post('/:id/apply', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { note } = req.body;
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      res.status(404).json({ message: 'Opportunity not found.' });
      return;
    }

    // Trigger in-app notification to poster
    if (opportunity.postedBy.toString() !== req.user!._id.toString()) {
      await Notification.create({
        recipient: opportunity.postedBy,
        sender: req.user!._id,
        type: 'opportunity',
        entityId: opportunity._id.toString(),
        message: `${req.user!.name} (${req.user!.institution}) registered candidacy for "${opportunity.title}": "${(note || '').substring(0, 50)}"`
      });
    }

    res.json({
      message: `Candidacy registered successfully with ${opportunity.organization}!`,
      opportunityId: opportunity._id
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting candidacy.', error: error.message });
  }
});

export default router;
