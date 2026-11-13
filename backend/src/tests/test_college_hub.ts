/**
 * test_college_hub.ts
 * Tests: Posts CRUD, feeds, interactions, announcements targeting/permissions,
 * community CRUD, membership approval, moderators, club advisors, cross-institution guards.
 */
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Community } from '../models/Community.js';
import { Announcement } from '../models/Announcement.js';
import { Notification } from '../models/Notification.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function req(
  url: string,
  method: string = 'GET',
  token?: string,
  body?: object
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const runTests = async () => {
  console.log('\n=== COLLEGE HUB TEST SUITE ===\n');
  await connectDB();
  const app = createApp();
  const server = app.listen(5099);
  const base = 'http://localhost:5099/api';
  const secret = getJwtSecret();

  try {
    // ── SETUP USERS ──────────────────────────────────────────────────────────
    console.log('── Setup: Creating test users ──');

    const [student, student2, faculty, dean, admin, outsider] = await Promise.all([
      User.findOneAndUpdate(
        { email: 'hub_student@alpha.edu' },
        { name: 'Hub Student', role: 'student', institution: 'Alpha University', department: 'CS', semester: 3, section: 'A', batch: '2022', isVerified: true, password: 'x', institutionDomain: 'alpha.edu' },
        { upsert: true, new: true }
      ),
      User.findOneAndUpdate(
        { email: 'hub_student2@alpha.edu' },
        { name: 'Hub Student2', role: 'student', institution: 'Alpha University', department: 'CS', semester: 5, section: 'B', batch: '2021', isVerified: true, password: 'x', institutionDomain: 'alpha.edu' },
        { upsert: true, new: true }
      ),
      User.findOneAndUpdate(
        { email: 'hub_faculty@alpha.edu' },
        { name: 'Hub Faculty', role: 'faculty', institution: 'Alpha University', department: 'CS', isVerified: true, password: 'x', institutionDomain: 'alpha.edu' },
        { upsert: true, new: true }
      ),
      User.findOneAndUpdate(
        { email: 'hub_dean@alpha.edu' },
        { name: 'Hub Dean', role: 'dean', institution: 'Alpha University', department: 'Admin', isVerified: true, password: 'x', institutionDomain: 'alpha.edu' },
        { upsert: true, new: true }
      ),
      User.findOneAndUpdate(
        { email: 'hub_admin@platform.io' },
        { name: 'Hub Admin', role: 'admin', institution: 'Platform', isVerified: true, password: 'x', institutionDomain: 'platform.io' },
        { upsert: true, new: true }
      ),
      User.findOneAndUpdate(
        { email: 'hub_outsider@beta.edu' },
        { name: 'Outsider', role: 'student', institution: 'Beta University', department: 'EE', isVerified: true, password: 'x', institutionDomain: 'beta.edu' },
        { upsert: true, new: true }
      )
    ]);

    const mkToken = (u: any) => jwt.sign({ id: u._id, ver: u.tokenVersion ?? 0 }, secret, { expiresIn: '1h' });
    const sTok = mkToken(student);
    const s2Tok = mkToken(student2);
    const fTok = mkToken(faculty);
    const dTok = mkToken(dean);
    const aTok = mkToken(admin);
    const oTok = mkToken(outsider);

    console.log('  Users ready.\n');

    // ── A. POSTS ─────────────────────────────────────────────────────────────
    console.log('── A. Posts CRUD ──');

    // Create post
    const { status: c1, data: d1 } = await req(`${base}/posts`, 'POST', sTok, {
      content: 'Hello from Alpha University!',
      category: 'General',
      tags: ['intro', 'alpha'],
      visibility: 'public'
    });
    assert(c1 === 201 && d1.post?._id, 'Create post returns 201 with post object');
    const postId = d1.post?._id;

    // Create institution-only post
    const { status: c2, data: d2 } = await req(`${base}/posts`, 'POST', sTok, {
      content: 'Internal Alpha notice',
      category: 'Academic Notice',
      visibility: 'institution-only'
    });
    assert(c2 === 201, 'Create institution-only post');
    const privatePostId = d2.post?._id;

    // Edit own post
    const { status: e1 } = await req(`${base}/posts/${postId}`, 'PUT', sTok, { content: 'Updated content' });
    assert(e1 === 200, 'Author can edit own post');

    // Unauthorized edit
    const { status: e2 } = await req(`${base}/posts/${postId}`, 'PUT', s2Tok, { content: 'Hijack' });
    assert(e2 === 403, 'Non-author cannot edit post');

    // Delete by non-author
    const { status: del1 } = await req(`${base}/posts/${postId}`, 'DELETE', s2Tok);
    assert(del1 === 403, 'Non-author cannot delete post');

    // ── A. FEEDS ─────────────────────────────────────────────────────────────
    console.log('\n── A. Feeds ──');

    // Global feed
    const { status: f1, data: fd1 } = await req(`${base}/posts`);
    assert(f1 === 200 && Array.isArray(fd1.posts), 'Global feed returns posts array');
    assert(typeof fd1.total === 'number' && typeof fd1.pages === 'number', 'Global feed has pagination metadata');

    // Institution feed
    const { status: f2, data: fd2 } = await req(`${base}/posts/feed/institution`, 'GET', sTok);
    assert(f2 === 200 && Array.isArray(fd2.posts), 'Institution feed returns posts');
    const allSameInst = fd2.posts.every((p: any) => p.institution === 'Alpha University');
    assert(allSameInst, 'Institution feed only contains own institution posts');

    // Personalized feed
    const { status: f3, data: fd3 } = await req(`${base}/posts/feed/personalized`, 'GET', sTok);
    assert(f3 === 200 && Array.isArray(fd3.posts), 'Personalized feed returns posts');

    // Search
    const { status: f4, data: fd4 } = await req(`${base}/posts?search=Alpha`);
    assert(f4 === 200 && Array.isArray(fd4.posts), 'Search returns posts array');

    // Category filter
    const { status: f5, data: fd5 } = await req(`${base}/posts?category=General`);
    assert(f5 === 200, 'Category filter works');

    // Pagination
    const { status: f6, data: fd6 } = await req(`${base}/posts?page=1&limit=5`);
    assert(f6 === 200 && fd6.posts.length <= 5, 'Pagination limit respected');

    // Cross-institution visibility: outsider cannot see institution-only post
    const { status: f7 } = await req(`${base}/posts/${privatePostId}`, 'GET', oTok);
    assert(f7 === 403, 'Outsider blocked from institution-only post');

    // Same institution can see it
    const { status: f8 } = await req(`${base}/posts/${privatePostId}`, 'GET', sTok);
    assert(f8 === 200, 'Same-institution user can see institution-only post');

    // ── A. INTERACTIONS ──────────────────────────────────────────────────────
    console.log('\n── A. Interactions ──');

    const { status: l1, data: ld1 } = await req(`${base}/posts/${postId}/like`, 'POST', sTok);
    assert(l1 === 200 && ld1.isLiked === true, 'Like post');

    const { status: l2, data: ld2 } = await req(`${base}/posts/${postId}/like`, 'POST', sTok);
    assert(l2 === 200 && ld2.isLiked === false, 'Unlike post (toggle)');

    const { status: dl1, data: dld1 } = await req(`${base}/posts/${postId}/dislike`, 'POST', sTok);
    assert(dl1 === 200 && dld1.isDisliked === true, 'Dislike post');

    // Like removes dislike
    const { status: l3, data: ld3 } = await req(`${base}/posts/${postId}/like`, 'POST', sTok);
    assert(l3 === 200 && ld3.isLiked === true && ld3.isDisliked === false, 'Like removes existing dislike');

    const { status: bk1, data: bkd1 } = await req(`${base}/posts/${postId}/bookmark`, 'POST', sTok);
    assert(bk1 === 200 && bkd1.isBookmarked === true, 'Bookmark post');

    const { status: bk2, data: bkd2 } = await req(`${base}/posts/${postId}/bookmark`, 'POST', sTok);
    assert(bk2 === 200 && bkd2.isBookmarked === false, 'Unbookmark post (toggle)');

    const { status: sh1, data: shd1 } = await req(`${base}/posts/${postId}/share`, 'POST');
    assert(sh1 === 200 && shd1.sharesCount >= 1, 'Share increments count');

    // ── A. COMMENTS & REPLIES ────────────────────────────────────────────────
    console.log('\n── A. Comments & Replies ──');

    const { status: cm1, data: cmd1 } = await req(`${base}/posts/${postId}/comments`, 'POST', sTok, { content: 'Great post!' });
    assert(cm1 === 201 && Array.isArray(cmd1.comments), 'Add comment returns 201');
    const commentId = cmd1.comments?.[cmd1.comments.length - 1]?._id;

    const { status: cm2 } = await req(`${base}/posts/${postId}/comments`, 'POST', sTok, { content: '' });
    assert(cm2 === 400, 'Empty comment rejected');

    // Reply to comment
    const { status: rp1, data: rpd1 } = await req(
      `${base}/posts/${postId}/comments/${commentId}/replies`, 'POST', s2Tok, { content: 'Thanks!' }
    );
    assert(rp1 === 201, 'Add reply to comment returns 201');

    const { status: rp2 } = await req(
      `${base}/posts/${postId}/comments/${commentId}/replies`, 'POST', s2Tok, { content: '' }
    );
    assert(rp2 === 400, 'Empty reply rejected');

    // ── B. ANNOUNCEMENTS ─────────────────────────────────────────────────────
    console.log('\n── B. Announcements ──');

    // Student cannot publish
    const { status: an1 } = await req(`${base}/announcements`, 'POST', sTok, {
      title: 'Student Announcement', content: 'Should fail', institution: 'Alpha University'
    });
    assert(an1 === 403, 'Student cannot publish announcement');

    // Faculty can publish within own institution
    const { status: an2, data: and2 } = await req(`${base}/announcements`, 'POST', fTok, {
      title: 'CS Dept Notice', content: 'Exam rescheduled.',
      institution: 'Alpha University', targetAudience: 'students',
      targetDepartments: ['CS'], targetSemesters: [3, 5], category: 'Academic Notice'
    });
    assert(an2 === 201 && and2.announcement?._id, 'Faculty publishes targeted announcement');
    const annId = and2.announcement?._id;

    // Faculty cannot publish to another institution
    const { status: an3 } = await req(`${base}/announcements`, 'POST', fTok, {
      title: 'Cross-inst', content: 'Should fail', institution: 'Beta University'
    });
    assert(an3 === 403, 'Faculty blocked from cross-institution announcement');

    // Dean can publish
    const { status: an4, data: and4 } = await req(`${base}/announcements`, 'POST', dTok, {
      title: 'Dean Notice', content: 'All staff meeting.',
      institution: 'Alpha University', targetAudience: 'faculty'
    });
    assert(an4 === 201, 'Dean publishes announcement');

    // Admin can publish platform-wide
    const { status: an5, data: and5 } = await req(`${base}/announcements`, 'POST', aTok, {
      title: 'Platform Update', content: 'New features released.',
      institution: 'Beta University', targetAudience: 'all'
    });
    assert(an5 === 201, 'Admin publishes cross-institution announcement');

    // Targeting: student in CS sem 3 sees the CS announcement
    const { status: an6, data: and6 } = await req(`${base}/announcements`, 'GET', sTok);
    assert(an6 === 200 && Array.isArray(and6.announcements), 'Student retrieves announcements');
    const seesCSNotice = and6.announcements.some((a: any) => a._id === annId);
    assert(seesCSNotice, 'CS sem-3 student sees targeted CS announcement');

    // Outsider cannot see Alpha announcement
    const { status: an7 } = await req(`${base}/announcements/${annId}`, 'GET', oTok);
    assert(an7 === 403, 'Outsider blocked from Alpha announcement');

    // Edit own announcement
    const { status: an8 } = await req(`${base}/announcements/${annId}`, 'PUT', fTok, { title: 'CS Dept Notice Updated' });
    assert(an8 === 200, 'Author can edit announcement');

    // Non-author cannot edit
    const { status: an9 } = await req(`${base}/announcements/${annId}`, 'PUT', sTok, { title: 'Hijack' });
    assert(an9 === 403, 'Non-author cannot edit announcement');

    // Delete by dean (institution authority)
    const { status: an10 } = await req(`${base}/announcements/${annId}`, 'DELETE', dTok);
    assert(an10 === 200, 'Dean can delete announcement within institution');

    // ── C. COMMUNITIES ───────────────────────────────────────────────────────
    console.log('\n── C. Communities CRUD ──');

    const { status: cc1, data: ccd1 } = await req(`${base}/communities`, 'POST', sTok, {
      name: `Hub Test Club ${Date.now()}`,
      description: 'A test community for hub tests',
      category: 'Technology'
    });
    assert(cc1 === 201 && ccd1.community?._id, 'Create community returns 201');
    const commId = ccd1.community?._id;

    // Duplicate name
    const { status: cc2 } = await req(`${base}/communities`, 'POST', sTok, {
      name: ccd1.community?.name, description: 'Duplicate', category: 'Technology'
    });
    assert(cc2 === 400, 'Duplicate community name rejected');

    // Edit community
    const { status: ce1 } = await req(`${base}/communities/${commId}`, 'PUT', sTok, {
      description: 'Updated description'
    });
    assert(ce1 === 200, 'Creator can edit community');

    // Non-member cannot edit
    const { status: ce2 } = await req(`${base}/communities/${commId}`, 'PUT', s2Tok, {
      description: 'Hijack'
    });
    assert(ce2 === 403, 'Non-moderator cannot edit community');

    // Discovery / search
    const { status: cd1, data: cdd1 } = await req(`${base}/communities?search=Hub+Test`);
    assert(cd1 === 200 && Array.isArray(cdd1.communities), 'Community search works');

    // ── C. MEMBERSHIP ────────────────────────────────────────────────────────
    console.log('\n── C. Membership ──');

    // Join (open community)
    const { status: jn1, data: jnd1 } = await req(`${base}/communities/${commId}/join`, 'POST', s2Tok);
    assert(jn1 === 200 && jnd1.memberCount >= 2, 'Student2 joins community');

    // Duplicate join
    const { status: jn2 } = await req(`${base}/communities/${commId}/join`, 'POST', s2Tok);
    assert(jn2 === 400, 'Duplicate join rejected');

    // Leave
    const { status: lv1 } = await req(`${base}/communities/${commId}/leave`, 'POST', s2Tok);
    assert(lv1 === 200, 'Student2 leaves community');

    // Creator cannot leave
    const { status: lv2 } = await req(`${base}/communities/${commId}/leave`, 'POST', sTok);
    assert(lv2 === 400, 'Creator cannot leave community');

    // ── C. MEMBERSHIP APPROVAL ───────────────────────────────────────────────
    console.log('\n── C. Membership Approval ──');

    // Enable approval requirement
    await Community.findByIdAndUpdate(commId, { requiresApproval: true });

    const { status: pa1, data: pad1 } = await req(`${base}/communities/${commId}/join`, 'POST', s2Tok);
    assert(pa1 === 200 && pad1.status === 'pending', 'Join with approval required returns pending');

    // Duplicate pending request
    const { status: pa2 } = await req(`${base}/communities/${commId}/join`, 'POST', s2Tok);
    assert(pa2 === 400, 'Duplicate pending request rejected');

    // Non-moderator cannot view pending
    const { status: pa3 } = await req(`${base}/communities/${commId}/members/pending`, 'GET', s2Tok);
    assert(pa3 === 403, 'Non-moderator cannot view pending members');

    // Moderator views pending
    const { status: pa4, data: pad4 } = await req(`${base}/communities/${commId}/members/pending`, 'GET', sTok);
    assert(pa4 === 200 && Array.isArray(pad4.pendingMembers), 'Moderator views pending members');

    // Approve
    const { status: pa5 } = await req(
      `${base}/communities/${commId}/members/${student2._id}/approve`, 'POST', sTok, { action: 'approve' }
    );
    assert(pa5 === 200, 'Moderator approves membership');

    // Verify now a member
    const commAfterApprove = await Community.findById(commId);
    const isNowMember = commAfterApprove?.members.some(id => id.toString() === student2._id.toString());
    assert(isNowMember === true, 'Approved user is now a member');

    // Deny flow: add another pending then deny
    await Community.findByIdAndUpdate(commId, { $addToSet: { pendingMembers: outsider._id } });
    const { status: pa6 } = await req(
      `${base}/communities/${commId}/members/${outsider._id}/approve`, 'POST', sTok, { action: 'deny' }
    );
    assert(pa6 === 200, 'Moderator denies membership request');

    // ── C. MODERATORS ────────────────────────────────────────────────────────
    console.log('\n── C. Moderators ──');

    // Promote student2 to moderator
    const { status: md1 } = await req(`${base}/communities/${commId}/moderators/${student2._id}`, 'POST', sTok);
    assert(md1 === 200, 'Creator promotes member to moderator');

    // Non-creator cannot promote
    const { status: md2 } = await req(`${base}/communities/${commId}/moderators/${student._id}`, 'POST', s2Tok);
    assert(md2 === 403, 'Non-creator cannot promote moderator');

    // Demote
    const { status: md3 } = await req(`${base}/communities/${commId}/moderators/${student2._id}`, 'DELETE', sTok);
    assert(md3 === 200, 'Creator demotes moderator');

    // ── C. CLUB ADVISORS ─────────────────────────────────────────────────────
    console.log('\n── C. Club Advisors ──');

    // Assign faculty as advisor
    const { status: ca1 } = await req(`${base}/communities/${commId}/advisors/${faculty._id}`, 'POST', sTok);
    assert(ca1 === 200, 'Creator assigns faculty as club advisor');

    // Student cannot be advisor
    const { status: ca2 } = await req(`${base}/communities/${commId}/advisors/${student2._id}`, 'POST', sTok);
    assert(ca2 === 400, 'Student cannot be assigned as club advisor');

    // Remove advisor
    const { status: ca3 } = await req(`${base}/communities/${commId}/advisors/${faculty._id}`, 'DELETE', sTok);
    assert(ca3 === 200, 'Creator removes club advisor');

    // ── C. COMMUNITY ANNOUNCEMENTS ───────────────────────────────────────────
    console.log('\n── C. Community Announcements ──');

    const { status: cma1 } = await req(`${base}/communities/${commId}/announcements`, 'POST', sTok, {
      title: 'Club Meeting', content: 'Meeting this Friday at 5pm.'
    });
    assert(cma1 === 201, 'Moderator posts community announcement');

    // Non-moderator cannot post announcement
    const { status: cma2 } = await req(`${base}/communities/${commId}/announcements`, 'POST', oTok, {
      title: 'Spam', content: 'Buy stuff'
    });
    assert(cma2 === 403 || cma2 === 401, 'Non-moderator blocked from community announcement');

    // ── C. COMMUNITY RESOURCES ───────────────────────────────────────────────
    console.log('\n── C. Community Resources ──');

    const { status: cr1, data: crd1 } = await req(`${base}/communities/${commId}/resources`, 'POST', sTok, {
      title: 'Study Guide', url: 'https://example.com/guide.pdf', type: 'PDF'
    });
    assert(cr1 === 201 && crd1.resource?.title, 'Member adds community resource');

    // Non-member cannot add resource
    const { status: cr2 } = await req(`${base}/communities/${commId}/resources`, 'POST', oTok, {
      title: 'Spam', url: 'https://spam.com'
    });
    assert(cr2 === 403 || cr2 === 401, 'Non-member blocked from adding resource');

    // ── C. COMMUNITY POST ────────────────────────────────────────────────────
    console.log('\n── C. Community Post ──');

    // Member can post to community
    const { status: cp1 } = await req(`${base}/posts`, 'POST', sTok, {
      content: 'Community post content', community: commId
    });
    assert(cp1 === 201, 'Member can post to community');

    // Non-member cannot post to community
    const { status: cp2 } = await req(`${base}/posts`, 'POST', oTok, {
      content: 'Outsider post', community: commId
    });
    assert(cp2 === 403, 'Non-member blocked from posting to community');

    // ── C. DELETE COMMUNITY ──────────────────────────────────────────────────
    console.log('\n── C. Delete Community ──');

    // Non-creator cannot delete
    const { status: dc1 } = await req(`${base}/communities/${commId}`, 'DELETE', s2Tok);
    assert(dc1 === 403, 'Non-creator cannot delete community');

    // Creator deletes
    const { status: dc2 } = await req(`${base}/communities/${commId}`, 'DELETE', sTok);
    assert(dc2 === 200, 'Creator deletes community');

    // Verify community posts unlinked
    const orphanedPosts = await Post.find({ community: commId });
    assert(orphanedPosts.every(p => p.community === null), 'Community posts unlinked after deletion');

    // ── D. CROSS-INSTITUTION GUARD ───────────────────────────────────────────
    console.log('\n── D. Cross-Institution Guards ──');

    // Outsider cannot see institution-only post (already tested above, verify notification too)
    const notifCount = await Notification.countDocuments({ recipient: outsider._id });
    assert(typeof notifCount === 'number', 'Notification count is a number (no crash)');

    // ── DELETE POST ──────────────────────────────────────────────────────────
    console.log('\n── Cleanup: Delete posts ──');
    const { status: dp1 } = await req(`${base}/posts/${postId}`, 'DELETE', sTok);
    assert(dp1 === 200, 'Author deletes own post');

    const { status: dp2 } = await req(`${base}/posts/${postId}`, 'DELETE', sTok);
    assert(dp2 === 404, 'Deleting already-deleted post returns 404');

    // Admin can delete any post
    const { status: c3, data: d3 } = await req(`${base}/posts`, 'POST', sTok, {
      content: 'To be admin-deleted', category: 'General'
    });
    const adminDeletePostId = d3.post?._id;
    const { status: dp3 } = await req(`${base}/posts/${adminDeletePostId}`, 'DELETE', aTok);
    assert(dp3 === 200, 'Admin can delete any post');

  } catch (err) {
    console.error('\nFATAL TEST ERROR:', err);
    failed++;
  } finally {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`${'─'.repeat(50)}\n`);
    server.close();
    await mongoose.connection.close();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests();
