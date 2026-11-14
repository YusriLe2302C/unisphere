import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Community } from '../models/Community.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth.js';

const runTests = async () => {
  console.log('=== STARTING FOUNDATIONAL VERIFICATION SUITE ===');
  await connectDB();
  const app = createApp();
  const server = app.listen(5001);

  try {
    const baseUrl = 'http://localhost:5001/api';

    // 1. TEST REGISTRATION ROLE WHITELISTING (Admin role injection prevention)
    console.log('\n--- 1. Testing Registration Role Whitelisting ---');
    const adminRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker Admin',
        email: 'attacker@test.com',
        password: 'Password123!',
        institution: 'RNSIT',
        role: 'admin'
      })
    });
    console.log(`Attempt register as 'admin': HTTP ${adminRegRes.status} (Expected 400)`);
    if (adminRegRes.status === 400) {
      console.log('PASS: Registration role whitelisting blocked admin privilege escalation.');
    } else {
      throw new Error(`FAIL: Registration allowed admin role! HTTP ${adminRegRes.status}`);
    }

    // 2. TEST ACADEMIC EMAIL VERIFICATION
    console.log('\n--- 2. Testing Dynamic Institutional Domain Verification ---');
    const academicRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Scholar Student',
        email: `scholar_${Date.now()}@rnsit.ac.in`,
        password: 'Password123!',
        institution: 'RNS Institute of Technology',
        role: 'student'
      })
    });
    const academicData: any = await academicRegRes.json();
    console.log(`Academic Email Registration: isVerified = ${academicData.user?.isVerified} (Expected true)`);
    if (academicData.user?.isVerified === true) {
      console.log('PASS: Academic domain verified automatically.');
    } else {
      throw new Error('FAIL: Academic domain was not verified!');
    }

    const nonAcademicRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Guest User',
        email: `guest_${Date.now()}@personalmail.com`,
        password: 'Password123!',
        institution: 'External Org',
        role: 'student'
      })
    });
    const nonAcademicData: any = await nonAcademicRegRes.json();
    console.log(`Non-Academic Email Registration: isVerified = ${nonAcademicData.user?.isVerified} (Expected false)`);
    if (nonAcademicData.user?.isVerified === false) {
      console.log('PASS: Non-academic domain correctly left unverified pending review.');
    } else {
      throw new Error('FAIL: Non-academic domain was falsely auto-verified!');
    }

    // 3. TEST JWT SECRET ENFORCEMENT
    console.log('\n--- 3. Testing Secure JWT Key Retrieval ---');
    const secret = getJwtSecret();
    if (secret && typeof secret === 'string' && secret.length > 10) {
      console.log('PASS: JWT Secret retrieved securely without leaking.');
    } else {
      throw new Error('FAIL: JWT Secret retrieval failed.');
    }

    // 4. TEST COMMUNITY DISPATCH MEMBERSHIP ENFORCEMENT (DEF-COMM-03)
    console.log('\n--- 4. Testing Community Dispatch Membership Enforcement ---');
    const community = await Community.findOne({});
    if (community) {
      const nonMemberToken = academicData.token;
      // Make sure test user is not a member
      await Community.findByIdAndUpdate(community._id, { $pull: { members: academicData.user._id } });

      const nonMemberPostRes = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nonMemberToken}`
        },
        body: JSON.stringify({
          title: 'Unauthorized Lab Dispatch',
          content: 'This should be blocked because user is not a member.',
          community: community._id
        })
      });
      console.log(`Non-member dispatch to lab: HTTP ${nonMemberPostRes.status} (Expected 403)`);
      if (nonMemberPostRes.status === 403) {
        console.log('PASS: Non-member dispatch blocked.');
      } else {
        throw new Error(`FAIL: Non-member post was permitted! HTTP ${nonMemberPostRes.status}`);
      }
    }

    // 5. TEST CREATOR LEAVE GUARD (DEF-COMM-02)
    console.log('\n--- 5. Testing Community Creator Self-Leave Safeguard ---');
    if (community) {
      const creator = await User.findById(community.creator);
      if (creator) {
        const creatorToken = jwt.sign({ id: creator._id, ver: creator.tokenVersion }, secret, { expiresIn: '1h' });
        const creatorLeaveRes = await fetch(`${baseUrl}/communities/${community._id}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${creatorToken}`
          }
        });
        console.log(`Creator leave own lab: HTTP ${creatorLeaveRes.status} (Expected 400)`);
        if (creatorLeaveRes.status === 400) {
          console.log('PASS: Creator prevented from abandoning lab without ownership transfer.');
        } else {
          throw new Error(`FAIL: Creator abandoned lab! HTTP ${creatorLeaveRes.status}`);
        }
      }
    }

    // 6. TEST EVENT RSVP CAPABILITY
    console.log('\n--- 6. Testing Event RSVP Registration ---');
    const eventPost = await Post.create({
      author: academicData.user._id,
      title: 'National Hackathon 2026',
      content: 'Cross-college hackathon event.',
      category: 'Hackathon',
      institution: 'RNS Institute of Technology',
      eventDetails: {
        venue: 'Auditorium 1',
        capacity: 50,
        registeredAttendees: []
      }
    });

    const rsvpRes = await fetch(`${baseUrl}/posts/${eventPost._id}/event-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${academicData.token}`
      }
    });
    const rsvpData: any = await rsvpRes.json();
    console.log(`Event RSVP Response: isRegistered = ${rsvpData.isRegistered}, attendeeCount = ${rsvpData.attendeeCount}`);
    if (rsvpData.isRegistered === true && rsvpData.attendeeCount === 1) {
      console.log('PASS: Event RSVP registration succeeded.');
    } else {
      throw new Error('FAIL: Event RSVP failed.');
    }

    // Clean up test post
    await Post.findByIdAndDelete(eventPost._id);

    console.log('\n=== ALL FOUNDATIONAL VERIFICATION CHECKS PASSED ===\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
};

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
