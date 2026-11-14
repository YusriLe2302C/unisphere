import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Post } from '../models/Post.js';
import { Community } from '../models/Community.js';
import { Notification } from '../models/Notification.js';
import { Subscription } from '../models/Subscription.js';
import { DeliveryService, IDeliveryTarget } from '../services/delivery.service.js';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth.js';
import { getInstitutionScope } from '../config/platform.config.js';

const router = Router();

const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// GET Institution-Specific Feed
router.get('/feed/institution', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, category, tag } = req.query;
    const user = req.user!;
    const filter: any = { institution: user.institution };
    if (category && category !== 'All') filter.category = category;
    if (tag) filter.tags = { $in: [tag as string] };

    const skip = (Number(page) - 1) * Number(limit);
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author', 'name avatar institution role headline isVerified')
        .populate('comments.user', 'name avatar institution role')
        .populate('community', 'name slug avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Post.countDocuments(filter)
    ]);

    res.json({ posts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving institution feed.', error: error.message });
  }
});

// GET Global Feed (with cross-college posts, category filter, audience, search, pagination)
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, tag, communityId, audience, search, query, limit = 20, page = 1 } = req.query;
    
    // Base institutional scope: cross-college public, plus institution-only if user matches
    const baseScope = getInstitutionScope(req.user?.institution);
    const filter: any = { ...baseScope };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (tag) {
      filter.tags = { $in: [tag as string] };
    }

    if (communityId) {
      filter.community = communityId;
    }

    if (audience && audience !== 'all') {
      filter.audience = { $in: ['all', audience as string] };
    }

    const searchTerm = (search || query) as string;
    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
      const escaped = escapeRegex(searchTerm.trim());
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: escaped, $options: 'i' } },
          { content: { $regex: escaped, $options: 'i' } },
          { tags: { $in: [new RegExp(escaped, 'i')] } }
        ]
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const posts = await Post.find(filter)
      .populate('author', 'name avatar institution role headline isVerified')
      .populate('comments.user', 'name avatar institution role')
      .populate('community', 'name slug avatar')
      .populate('eventDetails.registeredAttendees', 'name avatar institution')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Post.countDocuments(filter);

    res.json({
      posts,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving posts.', error: error.message });
  }
});

// GET Personalized Subscriptions Feed
router.get('/feed/personalized', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const userInst = req.user!.institution;

    const [subscriptions, joinedCommunities] = await Promise.all([
      Subscription.find({ user: userId }),
      Community.find({ members: userId }).select('_id')
    ]);

    const topicTags = subscriptions
      .filter(s => s.targetType === 'topic')
      .map(s => s.targetId.toLowerCase());

    const researcherIds = subscriptions
      .filter(s => s.targetType === 'researcher')
      .map(s => s.targetId);

    const categories = subscriptions
      .filter(s => s.targetType === 'opportunity_category')
      .map(s => s.targetId);

    const communityIds = [
      ...subscriptions.filter(s => s.targetType === 'community').map(s => s.targetId),
      ...joinedCommunities.map(c => c._id.toString())
    ];

    const matchConditions: any[] = [];
    if (topicTags.length > 0) matchConditions.push({ tags: { $in: topicTags } });
    if (researcherIds.length > 0) matchConditions.push({ author: { $in: researcherIds } });
    if (categories.length > 0) matchConditions.push({ category: { $in: categories } });
    if (communityIds.length > 0) matchConditions.push({ community: { $in: communityIds } });
    matchConditions.push({ institution: userInst });

    const filter: any = {
      $or: matchConditions.length > 0 ? matchConditions : [{ visibility: 'public' }]
    };

    const scope = getInstitutionScope(req.user?.institution);
    if (scope && scope.visibility) {
      filter.visibility = scope.visibility;
    }

    const posts = await Post.find(filter)
      .populate('author', 'name avatar institution role headline isVerified')
      .populate('comments.user', 'name avatar institution role')
      .populate('community', 'name slug avatar')
      .populate('eventDetails.registeredAttendees', 'name avatar institution')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      posts,
      total: posts.length,
      feedType: 'personalized'
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving personalized feed.', error: error.message });
  }
});

// GET Single Post
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name avatar institution role headline isVerified')
      .populate('comments.user', 'name avatar institution role')
      .populate('community', 'name slug avatar')
      .populate('eventDetails.registeredAttendees', 'name avatar institution');

    if (!post) {
      res.status(404).json({ message: 'Post not found.' });
      return;
    }

    // Enforce private institution visibility
    if (post.visibility === 'institution-only') {
      if (!req.user || req.user.institution !== post.institution) {
        res.status(403).json({ message: 'Forbidden: This circular/post is restricted to members of ' + (post.institution || 'its host institution') });
        return;
      }
    }

    res.json({ post });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching post.', error: error.message });
  }
});

// CREATE Post
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, category, tags, community, mediaUrl, audience, visibility, deadline, eventDetails } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ message: 'Post content cannot be empty.' });
      return;
    }

    // Community membership validation (DEF-COMM-03):
    // If a post is targeted at a specific community, ensure the author is a member
    if (community) {
      const targetCommunity = await Community.findById(community);
      if (!targetCommunity) {
        res.status(404).json({ message: 'Target research studio/community not found.' });
        return;
      }
      const isMember = targetCommunity.members.some(id => id.toString() === req.user!._id.toString());
      if (!isMember) {
        res.status(403).json({ message: 'Forbidden: You must join this research studio before broadcasting dispatches to it.' });
        return;
      }
    }

    const newPost = await Post.create({
      author: req.user!._id,
      title: (title || '').trim(),
      content: content.trim(),
      category: category || 'General',
      institution: req.user!.institution,
      audience: audience || 'all',
      visibility: visibility || 'public',
      tags: Array.isArray(tags) ? tags : [],
      community: community || null,
      mediaUrl: mediaUrl || '',
      deadline: deadline || '',
      eventDetails: eventDetails || null,
      likes: [],
      comments: []
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate('author', 'name avatar institution role headline isVerified')
      .populate('community', 'name slug avatar');

    // Pub-Sub Content Delivery
    const targets: IDeliveryTarget[] = [];
    if (newPost.tags && newPost.tags.length > 0) {
      newPost.tags.forEach(t => targets.push({ targetType: 'topic', targetId: t.toLowerCase() }));
    }
    if (newPost.category) {
      targets.push({ targetType: 'opportunity_category', targetId: newPost.category });
    }
    if (req.user!.department) {
      targets.push({ targetType: 'department', targetId: req.user!.department });
    }
    targets.push({ targetType: 'researcher', targetId: req.user!._id.toString() });

    await DeliveryService.deliverContentNotification({
      targets,
      senderId: req.user!._id,
      type: 'subscription_content',
      entityId: newPost._id.toString(),
      message: `${req.user!.name} broadcasted in #${newPost.category || 'Dispatches'}: "${newPost.title || newPost.content.substring(0, 45)}"`,
      visibility: newPost.visibility,
      institution: newPost.institution,
      communityId: newPost.community || undefined
    });

    res.status(201).json({ message: 'Post published successfully.', post: populatedPost });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating post.', error: error.message });
  }
});

// EVENT REGISTRATION / RSVP (atomic attendance toggle)
router.post('/:id/event-register', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post or event not found.' });
      return;
    }

    if (!post.eventDetails) {
      res.status(400).json({ message: 'This dispatch is not registered as an event with RSVP capabilities.' });
      return;
    }

    if (post.eventDetails.isCancelled) {
      res.status(400).json({ message: 'Registration is closed because this event has been cancelled.' });
      return;
    }

    const userId = req.user!._id;
    const currentAttendees = (post.eventDetails.registeredAttendees || []).map(id => id.toString());
    const currentWaitlist = (post.eventDetails.waitlist || []).map((entry: any) => (entry?.userId || entry).toString());
    const isRegistered = currentAttendees.includes(userId.toString());
    const isWaitlisted = currentWaitlist.includes(userId.toString());

    if (isWaitlisted) {
      // Leave waitlist
      const updated = await Post.findByIdAndUpdate(
        post._id,
        { $pull: { 'eventDetails.waitlist': { userId } } },
        { new: true }
      );
      res.json({
        message: 'Removed from event waitlist.',
        isRegistered: false,
        isWaitlisted: false,
        attendeeCount: updated?.eventDetails?.registeredAttendees?.length || 0,
        waitlistCount: updated?.eventDetails?.waitlist?.length || 0
      });
      return;
    }

    if (isRegistered) {
      // Cancel RSVP
      // Check if there is someone in waitlist to automatically promote!
      let promotedUserId: Types.ObjectId | null = null;
      if (post.eventDetails.waitlist && post.eventDetails.waitlist.length > 0) {
        const firstEntry = post.eventDetails.waitlist[0];
        promotedUserId = (firstEntry as any)?.userId || (firstEntry as Types.ObjectId);
      }

      // 1. Remove the cancelling user from registeredAttendees
      await Post.findByIdAndUpdate(post._id, {
        $pull: { 'eventDetails.registeredAttendees': userId }
      });

      // 2. If someone is on waitlist, pop from waitlist and add to registeredAttendees
      let updated;
      if (promotedUserId) {
        await Post.findByIdAndUpdate(post._id, {
          $pull: { 'eventDetails.waitlist': { userId: promotedUserId } }
        });
        updated = await Post.findByIdAndUpdate(
          post._id,
          { $addToSet: { 'eventDetails.registeredAttendees': promotedUserId } },
          { new: true }
        ).populate('author', 'name avatar institution');

        await Notification.create({
          recipient: promotedUserId,
          sender: post.author,
          type: 'event_registration' as any,
          entityId: post._id.toString(),
          message: `Good news! A spot opened up for "${post.title || 'Campus Event'}" and you have been promoted from the waitlist to confirmed attendee!`
        });
      } else {
        updated = await Post.findById(post._id).populate('author', 'name avatar institution');
      }

      res.json({
        message: 'Registration withdrawn.',
        isRegistered: false,
        isWaitlisted: false,
        attendeeCount: updated?.eventDetails?.registeredAttendees?.length || 0,
        waitlistCount: updated?.eventDetails?.waitlist?.length || 0
      });
    } else {
      // Check capacity
      if (post.eventDetails.capacity && post.eventDetails.capacity > 0) {
        if (currentAttendees.length >= post.eventDetails.capacity) {
          // Event full: add to waitlist!
          const updated = await Post.findByIdAndUpdate(
            post._id,
            { $addToSet: { 'eventDetails.waitlist': { userId, seatsRequested: 1, teamMembers: [] } } },
            { new: true }
          );

          res.json({
            message: 'Event is at maximum capacity. You have been added to the priority waitlist!',
            isRegistered: false,
            isWaitlisted: true,
            attendeeCount: updated?.eventDetails?.registeredAttendees?.length || 0,
            waitlistCount: updated?.eventDetails?.waitlist?.length || 0
          });
          return;
        }
      }

      const updated = await Post.findByIdAndUpdate(
        post._id,
        { $addToSet: { 'eventDetails.registeredAttendees': userId } },
        { new: true }
      ).populate('author', 'name avatar institution');

      // Notify organizer
      if (post.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'event_registration' as any,
          entityId: post._id.toString(),
          message: `${req.user!.name} (${req.user!.institution}) registered for your event: "${post.title || post.content.substring(0, 30)}"`
        });
      }

      res.json({
        message: 'Successfully registered for event!',
        isRegistered: true,
        isWaitlisted: false,
        attendeeCount: updated?.eventDetails?.registeredAttendees?.length || 0,
        waitlistCount: updated?.eventDetails?.waitlist?.length || 0
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating event registration.', error: error.message });
  }
});

// RECORD ATTENDANCE FOR AN EVENT (Organizer/Admin only)
router.post('/:id/record-attendance', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post or event not found.' });
      return;
    }

    if (!post.eventDetails) {
      res.status(400).json({ message: 'This dispatch is not registered as an event.' });
      return;
    }

    const isOrganizer = post.author.toString() === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';
    if (!isOrganizer && !isAdmin) {
      res.status(403).json({ message: 'Forbidden: Only the event organizer or an administrator can mark attendance.' });
      return;
    }

    const { attendeeId, attended } = req.body;
    if (!attendeeId) {
      res.status(400).json({ message: 'attendeeId is required.' });
      return;
    }

    // Verify attendeeId was registered
    const registered = (post.eventDetails.registeredAttendees || []).map(id => id.toString());
    if (!registered.includes(attendeeId.toString())) {
      res.status(400).json({ message: 'User is not registered for this event.' });
      return;
    }

    let updatedPost;
    if (attended === false) {
      updatedPost = await Post.findByIdAndUpdate(
        post._id,
        { $pull: { 'eventDetails.attendedAttendees': attendeeId } },
        { new: true }
      );
    } else {
      updatedPost = await Post.findByIdAndUpdate(
        post._id,
        { $addToSet: { 'eventDetails.attendedAttendees': attendeeId } },
        { new: true }
      );
    }

    res.json({
      message: attended === false ? 'Attendance unmarked.' : 'Attendance recorded.',
      recordedAttendanceCount: updatedPost?.eventDetails?.attendedAttendees?.length || 0,
      attendedAttendees: updatedPost?.eventDetails?.attendedAttendees || []
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error recording attendance.', error: error.message });
  }
});

// EDIT Post
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found.' });
      return;
    }

    if (post.author.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden: You can only edit your own posts.' });
      return;
    }

    const { title, content, category, tags, audience, visibility, deadline, eventDetails } = req.body;
    if (title !== undefined) post.title = title.trim();
    if (content) post.content = content.trim();
    if (category) post.category = category;
    if (tags) post.tags = tags;
    if (audience) post.audience = audience;
    if (visibility) post.visibility = visibility;
    const wasCancelled = post.eventDetails?.isCancelled;
    const prevVenue = post.eventDetails?.venue;
    const prevDate = post.eventDetails?.startDate ? new Date(post.eventDetails.startDate).getTime() : 0;
    const attendees = post.eventDetails?.registeredAttendees || [];

    if (deadline !== undefined) post.deadline = deadline;
    if (eventDetails !== undefined) {
      const existingObj = post.eventDetails ? (typeof (post.eventDetails as any).toObject === 'function' ? (post.eventDetails as any).toObject() : post.eventDetails) : {};
      post.eventDetails = {
        ...existingObj,
        ...eventDetails,
        registeredAttendees: eventDetails.registeredAttendees !== undefined ? eventDetails.registeredAttendees : attendees
      };
    }

    await post.save();

    // Alert attendees on cancellation or schedule/venue change
    if (post.eventDetails && attendees.length > 0) {
      if (eventDetails?.isCancelled && !wasCancelled) {
        await DeliveryService.deliverContentNotification({
          specificRecipients: attendees,
          senderId: req.user!._id,
          type: 'schedule_change',
          entityId: post._id.toString(),
          message: `⚠️ Schedule Notice: "${post.title || 'Campus Event'}" has been cancelled. (${eventDetails.cancellationReason || 'Notice of postponement'})`
        });
      } else if (
        (eventDetails?.venue && eventDetails.venue !== prevVenue) ||
        (eventDetails?.startDate && new Date(eventDetails.startDate).getTime() !== prevDate)
      ) {
        await DeliveryService.deliverContentNotification({
          specificRecipients: attendees,
          senderId: req.user!._id,
          type: 'schedule_change',
          entityId: post._id.toString(),
          message: `📅 Schedule Update: "${post.title || 'Campus Event'}" details were updated. Venue: ${post.eventDetails.venue}`
        });
      }
    }

    const updated = await Post.findById(post._id)
      .populate('author', 'name avatar institution role headline isVerified')
      .populate('comments.user', 'name avatar institution role')
      .populate('community', 'name slug avatar');

    res.json({ message: 'Post updated.', post: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating post.', error: error.message });
  }
});

// DELETE Post
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found.' });
      return;
    }

    if (post.author.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden: You can only delete your own posts.' });
      return;
    }

    await Post.findByIdAndDelete(post._id);
    res.json({ message: 'Post deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting post.', error: error.message });
  }
});

// TOGGLE LIKE
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found.' });
      return;
    }

    const userId = req.user!._id;
    const isLiked = (post.likes || []).some(id => id.toString() === userId.toString());

    if (isLiked) {
      const updated = await Post.findByIdAndUpdate(
        post._id,
        { $pull: { likes: userId } },
        { new: true }
      );
      res.json({ message: 'Post unliked.', likesCount: updated?.likes.length || 0, isLiked: false, dislikesCount: updated?.dislikes?.length || 0, isDisliked: false });
    } else {
      // Like and remove any dislike
      const updated = await Post.findByIdAndUpdate(
        post._id,
        { 
          $addToSet: { likes: userId },
          $pull: { dislikes: userId }
        },
        { new: true }
      );

      if (post.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'like',
          entityId: post._id.toString(),
          message: `${req.user!.name} (${req.user!.institution}) liked your dispatch.`
        });
      }

      res.json({ message: 'Post liked.', likesCount: updated?.likes.length || 0, isLiked: true, dislikesCount: updated?.dislikes?.length || 0, isDisliked: false });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating like.', error: error.message });
  }
});

// TOGGLE DISLIKE
router.post('/:id/dislike', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found.' });
      return;
    }

    const userId = req.user!._id;
    const isDisliked = (post.dislikes || []).some(id => id.toString() === userId.toString());

    if (isDisliked) {
      const updated = await Post.findByIdAndUpdate(
        post._id,
        { $pull: { dislikes: userId } },
        { new: true }
      );
      res.json({ message: 'Dislike removed.', dislikesCount: updated?.dislikes?.length || 0, isDisliked: false, likesCount: updated?.likes?.length || 0, isLiked: false });
    } else {
      // Dislike and remove any like
      const updated = await Post.findByIdAndUpdate(
        post._id,
        { 
          $addToSet: { dislikes: userId },
          $pull: { likes: userId }
        },
        { new: true }
      );
      res.json({ message: 'Post disliked.', dislikesCount: updated?.dislikes?.length || 0, isDisliked: true, likesCount: updated?.likes?.length || 0, isLiked: false });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating dislike.', error: error.message });
  }
});

// TOGGLE BOOKMARK / SAVE
router.post('/:id/bookmark', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found.' });
      return;
    }

    const userId = req.user!._id;
    const isBookmarked = (post.bookmarks || []).some(id => id.toString() === userId.toString());

    if (isBookmarked) {
      const updated = await Post.findByIdAndUpdate(
        post._id,
        { $pull: { bookmarks: userId } },
        { new: true }
      );
      res.json({ message: 'Post removed from saved collection.', isBookmarked: false, bookmarksCount: updated?.bookmarks?.length || 0 });
    } else {
      const updated = await Post.findByIdAndUpdate(
        post._id,
        { $addToSet: { bookmarks: userId } },
        { new: true }
      );
      res.json({ message: 'Post saved to bookmarks!', isBookmarked: true, bookmarksCount: updated?.bookmarks?.length || 0 });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Error saving bookmark.', error: error.message });
  }
});

// INCREMENT SHARE COUNT
router.post('/:id/share', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updated = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { sharesCount: 1 } },
      { new: true }
    );
    res.json({ message: 'Share link tracked.', sharesCount: updated?.sharesCount || 1 });
  } catch (error: any) {
    res.status(500).json({ message: 'Error tracking share.', error: error.message });
  }
});

// ADD COMMENT
router.post(['/:id/comments', '/:id/comment'], authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawContent = req.body.content || req.body.text;
    if (!rawContent || !rawContent.trim()) {
      res.status(400).json({ message: 'Comment content cannot be empty.' });
      return;
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found.' });
      return;
    }

    const updated = await Post.findByIdAndUpdate(
      post._id,
      {
        $push: {
          comments: {
            user: req.user!._id,
            content: rawContent.trim(),
            createdAt: new Date()
          }
        }
      },
      { new: true }
    )
      .populate('author', 'name avatar institution role headline isVerified')
      .populate('comments.user', 'name avatar institution role')
      .populate('community', 'name slug avatar');

    if (post.author.toString() !== req.user!._id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user!._id,
        type: 'comment',
        entityId: post._id.toString(),
        message: `${req.user!.name} commented on your post: "${rawContent.substring(0, 40)}..."`
      });
    }

    res.status(201).json({
      message: 'Comment added.',
      comments: updated?.comments,
      post: updated
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding comment.', error: error.message });
  }
});

// ADD REPLY TO COMMENT
router.post('/:id/comments/:commentId/replies', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ message: 'Reply content cannot be empty.' });
      return;
    }

    const post = await Post.findById(req.params.id);
    if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }

    const comment = post.comments.find(c => c._id?.toString() === req.params.commentId);
    if (!comment) { res.status(404).json({ message: 'Comment not found.' }); return; }

    const updated = await Post.findOneAndUpdate(
      { _id: post._id, 'comments._id': req.params.commentId },
      {
        $push: {
          'comments.$.replies': {
            user: req.user!._id,
            content: content.trim(),
            createdAt: new Date()
          }
        }
      },
      { new: true }
    )
      .populate('author', 'name avatar institution role headline isVerified')
      .populate('comments.user', 'name avatar institution role')
      .populate('comments.replies.user', 'name avatar institution role');

    // Notify comment author
    if (comment.user.toString() !== req.user!._id.toString()) {
      await Notification.create({
        recipient: comment.user,
        sender: req.user!._id,
        type: 'comment',
        entityId: post._id.toString(),
        message: `${req.user!.name} replied to your comment: "${content.substring(0, 40)}..."`
      });
    }

    res.status(201).json({ message: 'Reply added.', post: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding reply.', error: error.message });
  }
});

export default router;
