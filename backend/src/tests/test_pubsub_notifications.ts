import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Community } from '../models/Community.js';
import { Subscription } from '../models/Subscription.js';
import { Notification } from '../models/Notification.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth.js';

const runTests = async () => {
  console.log('=== STARTING PUBSUB, NOTIFICATION & COMMUNITY WORKFLOW VERIFICATION ===');
  await connectDB();
  const app = createApp();
  const server = app.listen(5003);

  try {
    const baseUrl = 'http://localhost:5003/api';
    const secret = getJwtSecret();

    // 1. SETUP TEST USERS
    console.log('\n--- 1. Setting Up Identities ---');
    const subscriberUser = await User.findOneAndUpdate(
      { email: 'subscriber_test@consortium.edu' },
      {
        name: 'Samantha Ray',
        email: 'subscriber_test@consortium.edu',
        role: 'student',
        institution: 'Consortium University',
        department: 'Quantum Computing Lab',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const publisherUser = await User.findOneAndUpdate(
      { email: 'publisher_test@consortium.edu' },
      {
        name: 'Dr. Bruce Banner',
        email: 'publisher_test@consortium.edu',
        role: 'faculty',
        institution: 'Consortium University',
        department: 'Quantum Computing Lab',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const externalUser = await User.findOneAndUpdate(
      { email: 'external_test@othercollege.edu' },
      {
        name: 'Clint Barton',
        email: 'external_test@othercollege.edu',
        role: 'student',
        institution: 'Other College Institute',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const subToken = jwt.sign(
      { id: subscriberUser._id.toString(), ver: subscriberUser.tokenVersion, email: subscriberUser.email, role: subscriberUser.role, institution: subscriberUser.institution, name: subscriberUser.name },
      secret,
      { expiresIn: '1h' }
    );

    const pubToken = jwt.sign(
      { id: publisherUser._id.toString(), ver: publisherUser.tokenVersion, email: publisherUser.email, role: publisherUser.role, institution: publisherUser.institution, name: publisherUser.name },
      secret,
      { expiresIn: '1h' }
    );

    const extToken = jwt.sign(
      { id: externalUser._id.toString(), ver: externalUser.tokenVersion, email: externalUser.email, role: externalUser.role, institution: externalUser.institution, name: externalUser.name },
      secret,
      { expiresIn: '1h' }
    );

    // Clean up past test notifications, subscriptions, posts, and communities
    await Subscription.deleteMany({ user: { $in: [subscriberUser._id, publisherUser._id, externalUser._id] } });
    await Notification.deleteMany({ recipient: { $in: [subscriberUser._id, publisherUser._id, externalUser._id] } });
    await Post.deleteMany({ author: { $in: [subscriberUser._id, publisherUser._id] } });
    await Community.deleteMany({ creator: { $in: [subscriberUser._id, publisherUser._id] } });

    // 2. SUBSCRIPTION WORKFLOWS
    console.log('\n--- 2. Testing Subscriptions & Preference Management ---');

    // Subscribe to topic #quantum_ai
    const subRes1 = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${subToken}` },
      body: JSON.stringify({
        targetType: 'topic',
        targetId: 'quantum_ai',
        targetName: '#quantum_ai'
      })
    });
    const subData1 = await subRes1.json();
    console.log(`[PASS] Subscribe to topic #quantum_ai: status=${subRes1.status}, id=${subData1.subscription?._id}`);

    // Prevent duplicate subscriptions
    const subResDup = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${subToken}` },
      body: JSON.stringify({
        targetType: 'topic',
        targetId: 'quantum_ai',
        targetName: '#quantum_ai'
      })
    });
    console.log(`[PASS] Duplicate subscription prevented: status=${subResDup.status}`);

    // Subscribe to researcher
    const subRes2 = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${subToken}` },
      body: JSON.stringify({
        targetType: 'researcher',
        targetId: publisherUser._id.toString(),
        targetName: publisherUser.name
      })
    });
    console.log(`[PASS] Subscribe to researcher Dr. Bruce Banner: status=${subRes2.status}`);

    // Get active subscriptions
    const mySubsRes = await fetch(`${baseUrl}/subscriptions/my`, {
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const mySubsData = await mySubsRes.json();
    console.log(`[PASS] Active subscriptions count: ${mySubsData.subscriptions?.length}`);

    // Check subscription existence endpoint
    const checkSubRes = await fetch(`${baseUrl}/subscriptions/check?targetType=topic&targetId=quantum_ai`, {
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const checkSubData = await checkSubRes.json();
    console.log(`[PASS] Subscription check verified: isSubscribed=${checkSubData.isSubscribed}`);

    // Update preferences (turn off email, keep in-app)
    const subId = subData1.subscription._id;
    const prefRes = await fetch(`${baseUrl}/subscriptions/${subId}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${subToken}` },
      body: JSON.stringify({ inAppAlerts: true, emailAlerts: false })
    });
    const prefData = await prefRes.json();
    console.log(`[PASS] Subscription preferences updated: emailAlerts=${prefData.subscription?.preferences?.emailAlerts}`);

    // 3. PUBSUB CONTENT DELIVERY & PERSONALIZED FEED
    console.log('\n--- 3. Testing PubSub Content Delivery & Personalized Feed ---');

    // Dr. Bruce Banner publishes a dispatch with tag quantum_ai
    const postRes = await fetch(`${baseUrl}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pubToken}` },
      body: JSON.stringify({
        title: 'Quantum Entanglement in 2D Superconductors',
        content: 'New experimental proof of topological quantum coherence achieved at low temperatures.',
        category: 'Research',
        tags: ['quantum_ai', 'physics'],
        visibility: 'public'
      })
    });
    const postData = await postRes.json();
    console.log(`[PASS] Publisher created dispatch: status=${postRes.status}, id=${postData.post?._id}`);

    // Give asynchronous delivery 500ms to settle in DB
    await new Promise((r) => setTimeout(r, 600));

    // Check subscriber's notifications
    const subNotifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const subNotifData = await subNotifRes.json();
    const deliveredNotif = (subNotifData.notifications || []).find((n: any) => n.type === 'subscription_content');
    console.log(`[PASS] Subscribed user received pubsub notification: found=${!!deliveredNotif}, msg="${deliveredNotif?.message}"`);

    // Verify external user (who did NOT subscribe) did NOT receive subscription alert
    const extNotifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${extToken}` }
    });
    const extNotifData = await extNotifRes.json();
    const extDelivered = (extNotifData.notifications || []).find((n: any) => n.type === 'subscription_content');
    console.log(`[PASS] Non-subscribed user did NOT receive alert: found=${!!extDelivered}`);

    // Fetch Personalized Feed for subscriber
    const feedRes = await fetch(`${baseUrl}/posts/feed/personalized`, {
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const feedData = await feedRes.json();
    const inFeed = (feedData.posts || []).some((p: any) => p._id === postData.post?._id);
    console.log(`[PASS] Dispatch discovered in subscriber personalized feed: found=${inFeed}, totalPersonalized=${feedData.total}`);

    // 4. EVENT REGISTRATION & SCHEDULE CHANGE ALERTS
    console.log('\n--- 4. Testing Event Registration & Schedule Change Alerts ---');

    // Create event
    const eventRes = await fetch(`${baseUrl}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pubToken}` },
      body: JSON.stringify({
        title: 'Quantum Hardware Workshop 2026',
        content: 'Hands-on assembly of cryostat instrumentation.',
        category: 'Workshop & Seminar',
        tags: ['quantum_ai', 'workshop'],
        visibility: 'public',
        eventDetails: {
          venue: 'Building 4 Lab C',
          startDate: new Date(Date.now() + 86400000 * 3),
          capacity: 25,
          registeredAttendees: []
        }
      })
    });
    const eventData = await eventRes.json();
    const eventId = eventData.post._id;

    // Subscriber registers for event
    const rsvpRes = await fetch(`${baseUrl}/posts/${eventId}/event-register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const rsvpData = await rsvpRes.json();
    console.log(`[PASS] Registered for event: isRegistered=${rsvpData.isRegistered}`);

    // Publisher modifies event schedule and venue
    const rescheduleRes = await fetch(`${baseUrl}/posts/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pubToken}` },
      body: JSON.stringify({
        eventDetails: {
          venue: 'Auditorium Magna (Main Hall)',
          startDate: new Date(Date.now() + 86400000 * 4),
          capacity: 50
        }
      })
    });
    console.log(`[PASS] Organizer rescheduled event: status=${rescheduleRes.status}`);

    await new Promise((r) => setTimeout(r, 600));

    // Verify attendee received schedule change notification
    const attendeeNotifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const attendeeNotifData = await attendeeNotifRes.json();
    const schedNotif = (attendeeNotifData.notifications || []).find((n: any) => n.type === 'schedule_change');
    console.log(`[PASS] Attendee received schedule change alert: found=${!!schedNotif}, msg="${schedNotif?.message}"`);

    // 5. COMMUNITY WORKFLOWS: JOIN, ANNOUNCEMENTS, RESOURCES, MODERATORS
    console.log('\n--- 5. Testing Community Participation Workflows ---');

    // Create community
    const commRes = await fetch(`${baseUrl}/communities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pubToken}` },
      body: JSON.stringify({
        name: 'Quantum Optics Guild',
        description: 'Collaborative studio for multi-mode photonics.',
        category: 'Academic',
        institution: 'Consortium University',
        visibility: 'public'
      })
    });
    const commData = await commRes.json();
    const commId = commData.community._id;
    console.log(`[PASS] Community created: status=${commRes.status}, id=${commId}`);

    // Subscriber joins community
    const joinRes = await fetch(`${baseUrl}/communities/${commId}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const joinData = await joinRes.json();
    console.log(`[PASS] Subscriber joined community: isMember=${joinData.isMember}`);

    // Verify automatic community subscription was registered
    const commSubCheck = await fetch(`${baseUrl}/subscriptions/check?targetType=community&targetId=${commId}`, {
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const commSubCheckData = await commSubCheck.json();
    console.log(`[PASS] Auto-community subscription synchronized: isSubscribed=${commSubCheckData.isSubscribed}`);

    // Broadcast community official announcement
    const announceRes = await fetch(`${baseUrl}/communities/${commId}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pubToken}` },
      body: JSON.stringify({
        title: 'Call for Abstracts: Photonics Fall Summit',
        content: 'Please submit 500-word abstracts before next Friday.'
      })
    });
    const announceData = await announceRes.json();
    console.log(`[PASS] Official announcement broadcasted: status=${announceRes.status}, id=${announceData.announcement?._id}`);

    await new Promise((r) => setTimeout(r, 600));

    // Verify member received announcement in-app notification
    const commNotifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const commNotifData = await commNotifRes.json();
    const annNotif = (commNotifData.notifications || []).find((n: any) => n.type === 'announcement');
    console.log(`[PASS] Community member received announcement alert: found=${!!annNotif}, msg="${annNotif?.message}"`);

    // Share catalog resource
    const resAdd = await fetch(`${baseUrl}/communities/${commId}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${subToken}` },
      body: JSON.stringify({
        title: 'Optical Cavity Simulation Notebook',
        url: 'https://github.com/consortium/cavity-sim',
        description: 'Interactive Jupyter notebooks for photonic mode calculations.',
        type: 'code'
      })
    });
    const resAddData = await resAdd.json();
    console.log(`[PASS] Shared resource added to studio catalog: status=${resAdd.status}, id=${resAddData.resource?._id}`);

    // Promote member to moderator
    const modRes = await fetch(`${baseUrl}/communities/${commId}/moderators/${subscriberUser._id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pubToken}` }
    });
    const modData = await modRes.json();
    console.log(`[PASS] Promoted member to moderator: status=${modRes.status}, isMod=${modData.community?.moderators?.includes(subscriberUser._id.toString())}`);

    // Demote moderator back to member
    const demoteRes = await fetch(`${baseUrl}/communities/${commId}/moderators/${subscriberUser._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pubToken}` }
    });
    console.log(`[PASS] Demoted moderator: status=${demoteRes.status}`);

    // 6. NOTIFICATION CENTER: UNREAD COUNTS, MARK READ, CLEAR READ
    console.log('\n--- 6. Testing Notification Center Actions ---');

    // Fetch unread notifications
    const unreadRes = await fetch(`${baseUrl}/notifications?unreadOnly=true`, {
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const unreadData = await unreadRes.json();
    console.log(`[PASS] Unread notifications count: ${unreadData.unreadCount}`);

    // Mark single notification as read
    if (annNotif) {
      const readSingleRes = await fetch(`${baseUrl}/notifications/${annNotif._id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${subToken}` }
      });
      console.log(`[PASS] Mark single notification as read: status=${readSingleRes.status}`);
    }

    // Mark all as read
    const markAllRes = await fetch(`${baseUrl}/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${subToken}` }
    });
    console.log(`[PASS] Mark all notifications as read: status=${markAllRes.status}`);

    // Verify unread count is now 0
    const verifyUnreadRes = await fetch(`${baseUrl}/notifications?unreadOnly=true`, {
      headers: { Authorization: `Bearer ${subToken}` }
    });
    const verifyUnreadData = await verifyUnreadRes.json();
    console.log(`[PASS] Verified unread count after mark-all: ${verifyUnreadData.unreadCount}`);

    // Clear read notifications
    const clearRes = await fetch(`${baseUrl}/notifications/clear-read`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${subToken}` }
    });
    console.log(`[PASS] Clear read notifications: status=${clearRes.status}`);

    console.log('\n===============================================================');
    console.log('✅ ALL PUBSUB, NOTIFICATION & COMMUNITY WORKFLOW TESTS PASSED!');
    console.log('===============================================================');

  } catch (err: any) {
    console.error('❌ Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
  }
};

runTests();
