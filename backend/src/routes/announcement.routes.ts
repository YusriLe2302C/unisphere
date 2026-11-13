import { Router, Response } from 'express';
import { Announcement } from '../models/Announcement.js';
import { User } from '../models/User.js';
import { DeliveryService } from '../services/delivery.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Permission matrix for publishing announcements:
 * - admin/superadmin: platform-wide, any institution
 * - principal/dean: own institution only, any targeting
 * - faculty: own institution only, limited to academic categories
 * - club_advisor (responsibility): own institution, community/club scope
 * - student/alumni: not permitted
 */
const ANNOUNCEMENT_ALLOWED_ROLES = ['admin', 'superadmin', 'principal', 'dean', 'faculty'];

function canPublishAnnouncement(user: any, targetInstitution: string): { allowed: boolean; reason?: string } {
  const role = user.role;
  const hasAdvisorResponsibility = (user.responsibilities || []).includes('club_advisor');

  if (role === 'admin' || role === 'superadmin') return { allowed: true };

  if (role === 'principal' || role === 'dean') {
    if (user.institution !== targetInstitution) {
      return { allowed: false, reason: 'You can only publish announcements within your own institution.' };
    }
    return { allowed: true };
  }

  if (role === 'faculty' || hasAdvisorResponsibility) {
    if (user.institution !== targetInstitution) {
      return { allowed: false, reason: 'You can only publish announcements within your own institution.' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Your role is not permitted to publish announcements.' };
}

// Build visibility filter for a user querying announcements
function buildVisibilityFilter(user: any) {
  const filter: any = {};

  if (user.role === 'admin' || user.role === 'superadmin') {
    return filter; // See all
  }

  // Institution scope
  filter.institution = user.institution;

  // Audience filter: must match 'all' or user's role-mapped audience
  const audienceMap: Record<string, string> = {
    student: 'students',
    faculty: 'faculty',
    alumni: 'alumni',
    dean: 'faculty',
    principal: 'faculty'
  };
  const userAudience = audienceMap[user.role] || 'all';
  filter.$or = [
    { targetAudience: 'all' },
    { targetAudience: userAudience }
  ];

  return filter;
}

// Check if a user matches the targeting criteria of an announcement
function userMatchesTargeting(user: any, ann: any): boolean {
  if (user.role === 'admin' || user.role === 'superadmin') return true;
  if (ann.institution !== user.institution) return false;

  const audienceMap: Record<string, string> = {
    student: 'students', faculty: 'faculty', alumni: 'alumni',
    dean: 'faculty', principal: 'faculty'
  };
  const userAudience = audienceMap[user.role] || 'all';
  if (ann.targetAudience !== 'all' && ann.targetAudience !== userAudience) return false;
  if (ann.targetRoles?.length > 0 && !ann.targetRoles.includes(user.role)) return false;
  if (ann.targetDepartments?.length > 0 && !ann.targetDepartments.includes(user.department)) return false;
  if (ann.targetAcademicYears?.length > 0 && !ann.targetAcademicYears.includes(user.batch)) return false;
  if (ann.targetSemesters?.length > 0 && !ann.targetSemesters.includes(user.semester)) return false;
  if (ann.targetSections?.length > 0 && !ann.targetSections.includes(user.section)) return false;

  return true;
}

// GET /announcements — list with targeting filter applied
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, category, institution } = req.query;
    const user = req.user!;

    const filter = buildVisibilityFilter(user);
    if (category) filter.category = category;
    // Admin can filter by institution explicitly
    if (institution && (user.role === 'admin' || user.role === 'superadmin')) {
      filter.institution = institution;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate('author', 'name avatar institution role department')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Announcement.countDocuments(filter)
    ]);

    // Further filter by granular targeting (roles, departments, semesters, sections)
    const targeted = announcements.filter(ann => userMatchesTargeting(user, ann));

    res.json({
      announcements: targeted,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving announcements.', error: err.message });
  }
});

// GET /announcements/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ann = await Announcement.findById(req.params.id)
      .populate('author', 'name avatar institution role department');
    if (!ann) { res.status(404).json({ message: 'Announcement not found.' }); return; }

    if (!userMatchesTargeting(req.user!, ann)) {
      res.status(403).json({ message: 'Forbidden: This announcement is not targeted at you.' });
      return;
    }

    res.json({ announcement: ann });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching announcement.', error: err.message });
  }
});

// POST /announcements — create
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      title, content, institution, targetAudience, targetRoles,
      targetDepartments, targetAcademicYears, targetSemesters, targetSections,
      category, isPinned, expiresAt
    } = req.body;

    if (!title || !content) {
      res.status(400).json({ message: 'Title and content are required.' });
      return;
    }

    const targetInst = institution || user.institution;
    const perm = canPublishAnnouncement(user, targetInst);
    if (!perm.allowed) {
      res.status(403).json({ message: perm.reason });
      return;
    }

    const ann = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      author: user._id,
      institution: targetInst,
      targetAudience: targetAudience || 'all',
      targetRoles: targetRoles || [],
      targetDepartments: targetDepartments || [],
      targetAcademicYears: targetAcademicYears || [],
      targetSemesters: targetSemesters || [],
      targetSections: targetSections || [],
      category: category || 'General',
      isPinned: isPinned || false,
      expiresAt: expiresAt || undefined
    });

    // Build recipient query matching targeting criteria
    const recipientQuery: any = { institution: targetInst, isActive: true };
    if (targetAudience && targetAudience !== 'all') {
      const roleMap: Record<string, string[]> = {
        students: ['student'],
        faculty: ['faculty', 'dean', 'principal'],
        alumni: ['alumni']
      };
      if (roleMap[targetAudience]) recipientQuery.role = { $in: roleMap[targetAudience] };
    }
    if (targetRoles?.length) recipientQuery.role = { $in: targetRoles };
    if (targetDepartments?.length) recipientQuery.department = { $in: targetDepartments };
    if (targetAcademicYears?.length) recipientQuery.batch = { $in: targetAcademicYears };
    if (targetSemesters?.length) recipientQuery.semester = { $in: targetSemesters };
    if (targetSections?.length) recipientQuery.section = { $in: targetSections };

    const recipients = await User.find(recipientQuery).select('_id');
    if (recipients.length > 0) {
      await DeliveryService.deliverContentNotification({
        specificRecipients: recipients.map(r => r._id),
        senderId: user._id,
        type: 'announcement',
        entityId: ann._id.toString(),
        message: `📢 [${targetInst}] ${title.trim()}`
      });
    }

    res.status(201).json({ message: 'Announcement published.', announcement: ann });
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating announcement.', error: err.message });
  }
});

// PUT /announcements/:id — edit
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) { res.status(404).json({ message: 'Announcement not found.' }); return; }

    const user = req.user!;
    const isAuthor = ann.author.toString() === user._id.toString();
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (!isAuthor && !isAdmin) {
      res.status(403).json({ message: 'Forbidden: You can only edit your own announcements.' });
      return;
    }

    const fields = ['title', 'content', 'targetAudience', 'targetRoles', 'targetDepartments',
      'targetAcademicYears', 'targetSemesters', 'targetSections', 'category', 'isPinned', 'expiresAt'];
    fields.forEach(f => { if (req.body[f] !== undefined) (ann as any)[f] = req.body[f]; });
    await ann.save();

    res.json({ message: 'Announcement updated.', announcement: ann });
  } catch (err: any) {
    res.status(500).json({ message: 'Error updating announcement.', error: err.message });
  }
});

// DELETE /announcements/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) { res.status(404).json({ message: 'Announcement not found.' }); return; }

    const user = req.user!;
    const isAuthor = ann.author.toString() === user._id.toString();
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    const isInstitutionAuthority = (user.role === 'principal' || user.role === 'dean') && user.institution === ann.institution;

    if (!isAuthor && !isAdmin && !isInstitutionAuthority) {
      res.status(403).json({ message: 'Forbidden: Insufficient permissions to delete this announcement.' });
      return;
    }

    await Announcement.findByIdAndDelete(ann._id);
    res.json({ message: 'Announcement deleted.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting announcement.', error: err.message });
  }
});

export default router;
