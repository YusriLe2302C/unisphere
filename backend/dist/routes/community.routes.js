"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Community_js_1 = require("../models/Community.js");
const Post_js_1 = require("../models/Post.js");
const Notification_js_1 = require("../models/Notification.js");
const Subscription_js_1 = require("../models/Subscription.js");
const delivery_service_js_1 = require("../services/delivery.service.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Helper to make slug
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
// GET all communities with search and category filter
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        const filter = {};
        if (category && category !== 'All') {
            filter.category = category;
        }
        if (search && typeof search === 'string' && search.trim()) {
            const escaped = escapeRegex(search.trim());
            filter.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } }
            ];
        }
        const communities = await Community_js_1.Community.find(filter)
            .populate('creator', 'name institution role')
            .sort({ createdAt: -1 });
        res.json({ communities });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving communities.', error: error.message });
    }
});
// GET single community by ID or slug
router.get('/:idOrSlug', async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        let community = null;
        if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
            community = await Community_js_1.Community.findById(idOrSlug)
                .populate('creator', 'name avatar institution role')
                .populate('members', 'name avatar institution role headline')
                .populate('moderators', 'name avatar institution role')
                .populate('announcements.author', 'name avatar institution role')
                .populate('resources.addedBy', 'name avatar institution role');
        }
        if (!community) {
            community = await Community_js_1.Community.findOne({ slug: idOrSlug })
                .populate('creator', 'name avatar institution role')
                .populate('members', 'name avatar institution role headline')
                .populate('moderators', 'name avatar institution role')
                .populate('announcements.author', 'name avatar institution role')
                .populate('resources.addedBy', 'name avatar institution role');
        }
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const postCount = await Post_js_1.Post.countDocuments({ community: community._id });
        res.json({
            community,
            stats: {
                memberCount: community.members.length,
                postCount
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching community.', error: error.message });
    }
});
// CREATE Community
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { name, description, category, banner, avatar, rules } = req.body;
        if (!name || !description) {
            res.status(400).json({ message: 'Community name and description are required.' });
            return;
        }
        const slug = slugify(name);
        const existing = await Community_js_1.Community.findOne({ $or: [{ slug }, { name: name.trim() }] });
        if (existing) {
            res.status(400).json({ message: 'A community with this name or slug already exists.' });
            return;
        }
        const creatorId = req.user._id;
        const newCommunity = await Community_js_1.Community.create({
            name: name.trim(),
            slug,
            description: description.trim(),
            category: category || 'General',
            banner: banner || undefined,
            avatar: avatar || undefined,
            rules: rules || undefined,
            creator: creatorId,
            members: [creatorId], // Creator is automatically first member
            moderators: [creatorId] // Creator is initial moderator
        });
        // Auto-subscribe creator to community
        await Subscription_js_1.Subscription.findOneAndUpdate({
            user: creatorId,
            targetType: 'community',
            targetId: newCommunity._id.toString()
        }, {
            $set: {
                targetName: newCommunity.name,
                preferences: { inAppAlerts: true, emailAlerts: false }
            }
        }, { upsert: true });
        res.status(201).json({ message: 'Community created successfully.', community: newCommunity });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating community.', error: error.message });
    }
});
// JOIN Community (Prevents duplicates & syncs Subscription)
router.post('/:id/join', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const userId = req.user._id;
        const isMember = community.members.some(id => id.toString() === userId.toString());
        if (isMember) {
            res.status(400).json({ message: 'You are already a member of this community.' });
            return;
        }
        // Atomic join via $addToSet
        const updated = await Community_js_1.Community.findByIdAndUpdate(community._id, { $addToSet: { members: userId } }, { new: true });
        // Auto-subscribe member to community updates
        await Subscription_js_1.Subscription.findOneAndUpdate({
            user: userId,
            targetType: 'community',
            targetId: community._id.toString()
        }, {
            $set: {
                targetName: community.name,
                preferences: { inAppAlerts: true, emailAlerts: false }
            }
        }, { upsert: true });
        // Notify creator
        if (community.creator.toString() !== userId.toString()) {
            await Notification_js_1.Notification.create({
                recipient: community.creator,
                sender: userId,
                type: 'community_join',
                entityId: community._id.toString(),
                message: `${req.user.name} (${req.user.institution}) joined ${community.name}.`
            });
        }
        res.json({ message: `Joined ${community.name} successfully.`, memberCount: updated?.members.length || 0 });
    }
    catch (error) {
        res.status(500).json({ message: 'Error joining community.', error: error.message });
    }
});
// LEAVE Community & remove subscription
router.post('/:id/leave', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const userId = req.user._id;
        // Guard against creator leaving without ownership transfer (DEF-COMM-02)
        if (community.creator.toString() === userId.toString()) {
            res.status(400).json({
                message: 'The lab director/creator cannot depart their chartered studio. Transfer ownership or uncharter the lab.'
            });
            return;
        }
        // Atomic leave via $pull
        const updated = await Community_js_1.Community.findByIdAndUpdate(community._id, { $pull: { members: userId, moderators: userId } }, { new: true });
        // Remove subscription
        await Subscription_js_1.Subscription.findOneAndDelete({
            user: userId,
            targetType: 'community',
            targetId: community._id.toString()
        });
        res.json({ message: `Left ${community.name}.`, memberCount: updated?.members.length || 0 });
    }
    catch (error) {
        res.status(500).json({ message: 'Error leaving community.', error: error.message });
    }
});
// POST COMMUNITY ANNOUNCEMENT (Director or Moderator only)
router.post('/:id/announcements', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isCreator = community.creator.toString() === userId;
        const isMod = community.moderators.some(id => id.toString() === userId);
        const isAdmin = req.user.role === 'admin';
        if (!isCreator && !isMod && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: Only lab directors or moderators can broadcast official announcements.' });
            return;
        }
        const { title, content } = req.body;
        if (!title || !content) {
            res.status(400).json({ message: 'Announcement title and content are required.' });
            return;
        }
        const announcement = {
            title: title.trim(),
            content: content.trim(),
            author: req.user._id,
            createdAt: new Date()
        };
        community.announcements.unshift(announcement);
        await community.save();
        // Broadcast in-app alerts to all members via DeliveryService
        await delivery_service_js_1.DeliveryService.deliverContentNotification({
            communityId: community._id,
            senderId: req.user._id,
            type: 'announcement',
            entityId: community._id.toString(),
            message: `📢 [${community.name}] Announcement: "${title.trim()}"`
        });
        res.status(201).json({
            message: 'Official announcement broadcasted to all studio researchers.',
            announcement
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error publishing announcement.', error: error.message });
    }
});
// ADD COMMUNITY RESOURCE (Members or Moderators)
router.post('/:id/resources', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isMember = community.members.some(id => id.toString() === userId);
        const isAdmin = req.user.role === 'admin';
        if (!isMember && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: You must be a member of this studio to share resources.' });
            return;
        }
        const { title, url, description, type } = req.body;
        if (!title || !url) {
            res.status(400).json({ message: 'Resource title and valid URL are required.' });
            return;
        }
        const resource = {
            title: title.trim(),
            url: url.trim(),
            description: description ? description.trim() : '',
            type: type || 'Document',
            addedBy: req.user._id,
            createdAt: new Date()
        };
        community.resources.unshift(resource);
        await community.save();
        res.status(201).json({
            message: 'Academic resource shared with the studio.',
            resource
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error adding resource.', error: error.message });
    }
});
// DELETE COMMUNITY RESOURCE
router.delete('/:id/resources/:resourceId', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isCreator = community.creator.toString() === userId;
        const isMod = community.moderators.some(id => id.toString() === userId);
        const isAdmin = req.user.role === 'admin';
        const resource = community.resources.find(r => r._id?.toString() === req.params.resourceId);
        if (!resource) {
            res.status(404).json({ message: 'Resource not found.' });
            return;
        }
        const isAuthor = resource.addedBy.toString() === userId;
        if (!isAuthor && !isCreator && !isMod && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: You cannot delete this shared resource.' });
            return;
        }
        community.resources = community.resources.filter(r => r._id?.toString() !== req.params.resourceId);
        await community.save();
        res.json({ message: 'Resource removed.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting resource.', error: error.message });
    }
});
// PROMOTE MEMBER TO MODERATOR (Creator or Admin)
router.post('/:id/moderators/:userId', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const requesterId = req.user._id.toString();
        const isCreator = community.creator.toString() === requesterId;
        const isAdmin = req.user.role === 'admin';
        if (!isCreator && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: Only the lab director can appoint moderators.' });
            return;
        }
        const targetUserId = req.params.userId;
        const isMember = community.members.some(id => id.toString() === targetUserId);
        if (!isMember) {
            res.status(400).json({ message: 'User must be a member of the studio before appointment as moderator.' });
            return;
        }
        const updated = await Community_js_1.Community.findByIdAndUpdate(community._id, { $addToSet: { moderators: targetUserId } }, { new: true });
        res.json({
            message: 'Researcher appointed as studio moderator.',
            moderators: updated?.moderators
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error appointing moderator.', error: error.message });
    }
});
// DEMOTE MODERATOR (Creator or Admin)
router.delete('/:id/moderators/:userId', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const requesterId = req.user._id.toString();
        const isCreator = community.creator.toString() === requesterId;
        const isAdmin = req.user.role === 'admin';
        if (!isCreator && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: Only the lab director can demote moderators.' });
            return;
        }
        const targetUserId = req.params.userId;
        if (community.creator.toString() === targetUserId) {
            res.status(400).json({ message: 'Cannot demote the primary lab director.' });
            return;
        }
        const updated = await Community_js_1.Community.findByIdAndUpdate(community._id, { $pull: { moderators: targetUserId } }, { new: true });
        res.json({
            message: 'Moderator status revoked.',
            moderators: updated?.moderators
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error demoting moderator.', error: error.message });
    }
});
// EXPEL / REMOVE MEMBER (Creator, Moderator, or Admin) (DEF-COMM-01)
router.delete('/:id/members/:userId', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const requesterId = req.user._id.toString();
        const isCreator = community.creator.toString() === requesterId;
        const isMod = community.moderators.some(id => id.toString() === requesterId);
        const isAdmin = req.user.role === 'admin';
        if (!isCreator && !isMod && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: Only moderators or directors can remove researchers from this studio.' });
            return;
        }
        const targetUserId = req.params.userId;
        // Cannot expel the creator
        if (community.creator.toString() === targetUserId) {
            res.status(400).json({ message: 'Cannot remove the primary lab director.' });
            return;
        }
        const updated = await Community_js_1.Community.findByIdAndUpdate(community._id, { $pull: { members: targetUserId, moderators: targetUserId } }, { new: true });
        // Remove subscription
        await Subscription_js_1.Subscription.findOneAndDelete({
            user: targetUserId,
            targetType: 'community',
            targetId: community._id.toString()
        });
        res.json({
            message: 'Member removed from research studio.',
            memberCount: updated?.members.length || 0
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error removing member.', error: error.message });
    }
});
// EDIT Community (Creator, Moderator, or Admin)
router.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isMod = community.moderators.some(id => id.toString() === userId);
        const isCreator = community.creator.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        if (!isCreator && !isMod && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: You do not have permission to edit this community.' });
            return;
        }
        const { description, rules, banner, avatar, category } = req.body;
        if (description)
            community.description = description.trim();
        if (rules && Array.isArray(rules))
            community.rules = rules;
        if (banner)
            community.banner = banner;
        if (avatar)
            community.avatar = avatar;
        if (category)
            community.category = category;
        await community.save();
        res.json({ message: 'Community updated successfully.', community });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating community.', error: error.message });
    }
});
// DELETE Community (Creator or Admin) (DEF-COMM-04: unlinks orphaned posts)
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const community = await Community_js_1.Community.findById(req.params.id);
        if (!community) {
            res.status(404).json({ message: 'Community not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isCreator = community.creator.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        if (!isCreator && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: Only the creator or administrator can delete this community.' });
            return;
        }
        // Unlink dependent posts rather than leaving broken references (DEF-COMM-04)
        await Post_js_1.Post.updateMany({ community: community._id }, { $set: { community: null } });
        // Clean up all subscriptions for this community
        await Subscription_js_1.Subscription.deleteMany({ targetType: 'community', targetId: community._id.toString() });
        await Community_js_1.Community.findByIdAndDelete(community._id);
        res.json({ message: 'Community unchartered and dependent dispatches preserved safely.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting community.', error: error.message });
    }
});
// GET Community Posts
router.get('/:id/posts', async (req, res) => {
    try {
        const posts = await Post_js_1.Post.find({ community: req.params.id })
            .populate('author', 'name avatar institution role headline isVerified')
            .populate('comments.user', 'name avatar institution role')
            .sort({ createdAt: -1 });
        res.json({ posts });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching community posts.', error: error.message });
    }
});
exports.default = router;
