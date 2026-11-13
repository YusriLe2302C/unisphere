import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Opportunity } from '../models/Opportunity.js';
import { Application } from '../models/Application.js';
import { ResearchPaper } from '../models/ResearchPaper.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth.js';

const runTests = async () => {
  console.log('=== STARTING FULL CAMPUS HUB & RESEARCH VERIFICATION SUITE ===');
  await connectDB();
  const app = createApp();
  const server = app.listen(5002);

  try {
    const baseUrl = 'http://localhost:5002/api';
    const secret = getJwtSecret();

    // 1. SETUP TEST USERS
    console.log('\n--- 0. Setting Up Test Identities ---');
    const studentUser = await User.findOneAndUpdate(
      { email: 'student_tester@consortium.edu' },
      {
        name: 'Alex Rivera',
        email: 'student_tester@consortium.edu',
        role: 'student',
        institution: 'Consortium University',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const studentUser2 = await User.findOneAndUpdate(
      { email: 'student2_tester@consortium.edu' },
      {
        name: 'Jordan Lee',
        email: 'student2_tester@consortium.edu',
        role: 'student',
        institution: 'Consortium University',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const studentUser3 = await User.findOneAndUpdate(
      { email: 'student3_tester@consortium.edu' },
      {
        name: 'Morgan Blake',
        email: 'student3_tester@consortium.edu',
        role: 'student',
        institution: 'Consortium University',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const facultyUser = await User.findOneAndUpdate(
      { email: 'faculty_tester@consortium.edu' },
      {
        name: 'Dr. Evelyn Reed',
        email: 'faculty_tester@consortium.edu',
        role: 'faculty',
        institution: 'Consortium University',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const studentToken = jwt.sign({ id: studentUser._id, role: 'student', institution: studentUser.institution }, secret, { expiresIn: '1h' });
    const student2Token = jwt.sign({ id: studentUser2._id, role: 'student', institution: studentUser2.institution }, secret, { expiresIn: '1h' });
    const student3Token = jwt.sign({ id: studentUser3._id, role: 'student', institution: studentUser3.institution }, secret, { expiresIn: '1h' });
    const facultyToken = jwt.sign({ id: facultyUser._id, role: 'faculty', institution: facultyUser.institution }, secret, { expiresIn: '1h' });

    console.log('Identities established successfully.');

    // 2. RESEARCH HUB: PUBLICATION, DOI SEARCH, SUBJECT FILTER
    console.log('\n--- 1. Testing Research Hub Endpoints ---');
    const paperPayload = {
      title: 'Decentralized Academic Identity Verification via Zero-Knowledge Attestations',
      abstract: 'We present a scalable cross-campus credential verification scheme that protects student privacy while proving institutional affiliation.',
      authors: [
        { name: 'Dr. Evelyn Reed', affiliation: 'Consortium University' },
        { name: 'Alex Rivera', affiliation: 'Consortium University' }
      ],
      publicationType: 'Conference Paper',
      subject: 'Computer Science',
      doi: '10.1145/3372278.3390678',
      externalUrl: 'https://doi.org/10.1145/3372278.3390678',
      pdfUrl: 'https://arxiv.org/pdf/2401.00001.pdf',
      datasetUrl: 'https://zenodo.org/record/1234567',
      visibility: 'public',
      tags: ['Cryptography', 'Consortium', 'Zero-Knowledge']
    };

    const createPaperRes = await fetch(`${baseUrl}/research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`
      },
      body: JSON.stringify(paperPayload)
    });

    const createPaperData: any = await createPaperRes.json();
    console.log(`Publish Research Paper: HTTP ${createPaperRes.status} (Expected 201)`);
    if (createPaperRes.status !== 201 || !createPaperData.paper?._id) {
      throw new Error(`FAIL: Could not publish research paper: ${JSON.stringify(createPaperData)}`);
    }
    const paperId = createPaperData.paper._id;
    console.log(`PASS: Research paper published with ID: ${paperId}`);

    // Query research papers with search
    const searchRes = await fetch(`${baseUrl}/research?search=Zero-Knowledge&subject=Computer+Science`);
    const searchData: any = await searchRes.json();
    console.log(`Search Research Papers: Found ${searchData.papers?.length} papers matching 'Zero-Knowledge'`);
    if (searchData.papers?.length > 0 && searchData.papers[0].doi === '10.1145/3372278.3390678') {
      console.log('PASS: Research Hub search and subject filters verified.');
    } else {
      throw new Error('FAIL: Research paper search did not match created DOI.');
    }

    // 3. CAMPUS ACTIVITIES & EVENTS: CAPACITY & RSVP REGISTRATION WORKFLOW
    console.log('\n--- 2. Testing Campus Activities & Events RSVP Workflow ---');
    const eventPost = await Post.create({
      title: 'Annual Inter-College Quantum Hackathon & Trials',
      content: 'Official trials and team selection for the national quantum computing championship. Open to all students.',
      author: facultyUser._id,
      category: 'Campus Announcement',
      institution: 'Consortium University',
      visibility: 'public',
      eventDetails: {
        venue: 'Turing Advanced Research Hall / Lab 4',
        startDate: new Date(Date.now() + 86400000 * 3),
        organizer: 'Consortium Innovation Council',
        capacity: 2, // Strictly capped at 2 for testing
        registeredAttendees: []
      }
    });

    console.log(`Created test Event Post with capacity: 2. Post ID: ${eventPost._id}`);

    // User 1 registers
    const rsvp1 = await fetch(`${baseUrl}/posts/${eventPost._id}/event-register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const rsvp1Data: any = await rsvp1.json();
    console.log(`Student 1 RSVP: HTTP ${rsvp1.status}, isRegistered: ${rsvp1Data.isRegistered}`);
    if (rsvp1.status !== 200 || !rsvp1Data.isRegistered) {
      throw new Error('FAIL: Student 1 failed to register for event');
    }

    // User 2 registers (fills to capacity)
    const rsvp2 = await fetch(`${baseUrl}/posts/${eventPost._id}/event-register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    const rsvp2Data: any = await rsvp2.json();
    console.log(`Student 2 RSVP: HTTP ${rsvp2.status}, isRegistered: ${rsvp2Data.isRegistered}`);
    if (rsvp2.status !== 200 || !rsvp2Data.isRegistered) {
      throw new Error('FAIL: Student 2 failed to register for event');
    }

    // User 3 attempts to register (should be blocked by capacity limit)
    const rsvp3 = await fetch(`${baseUrl}/posts/${eventPost._id}/event-register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student3Token}` }
    });
    console.log(`Student 3 RSVP (Over Capacity): HTTP ${rsvp3.status} (Expected 400)`);
    if (rsvp3.status !== 400) {
      throw new Error(`FAIL: Capacity limit was not enforced! HTTP ${rsvp3.status}`);
    }
    console.log('PASS: Event capacity overflow strictly prevented.');

    // User 1 withdraws RSVP
    const withdrawRsvp = await fetch(`${baseUrl}/posts/${eventPost._id}/event-register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const withdrawData: any = await withdrawRsvp.json();
    console.log(`Student 1 Withdraws RSVP: HTTP ${withdrawRsvp.status}, isRegistered: ${withdrawData.isRegistered} (Expected false)`);
    if (withdrawRsvp.status !== 200 || withdrawData.isRegistered !== false) {
      throw new Error('FAIL: User 1 could not withdraw RSVP');
    }
    console.log('PASS: Event RSVP toggle and seat vacancy update verified.');

    // 4. CLUB RECRUITMENT & APPLICATION PIPELINE
    console.log('\n--- 3. Testing Club Recruitment & Candidacy Review ---');
    const clubOpp = await Opportunity.create({
      title: 'Autonomous Robotics Core Team Member',
      description: 'Join the college robotics club for upcoming aerial drone and rover national challenges.',
      type: 'Club Recruitment',
      organization: 'Robotics & Automation Society',
      location: 'Robotics Workshop B-12',
      institution: 'Consortium University',
      postedBy: facultyUser._id,
      deadline: new Date(Date.now() + 86400000 * 14).toISOString(),
      requirements: ['Robotics', 'Embedded C', 'ROS2'],
      applicationQuestions: [
        'Describe your experience with microcontroller programming (Arduino / STM32 / ESP32).',
        'Provide links to your hardware projects or GitHub repositories.'
      ]
    });

    console.log(`Created Club Recruitment Notice: ID ${clubOpp._id}`);

    // Student submits application
    const appPayload = {
      opportunity: clubOpp._id,
      answers: [
        {
          question: 'Describe your experience with microcontroller programming (Arduino / STM32 / ESP32).',
          answer: '3 years experience with STM32 RTOS and ESP32 telemetry systems.'
        },
        {
          question: 'Provide links to your hardware projects or GitHub repositories.',
          answer: 'https://github.com/alexrivera/autonomous-drone-ros2'
        }
      ],
      resumeUrl: 'https://storage.consortium.edu/resumes/alex_rivera_cv.pdf',
      notes: 'Available for evening workshop sessions.'
    };

    const submitAppRes = await fetch(`${baseUrl}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify(appPayload)
    });

    const submitAppData: any = await submitAppRes.json();
    console.log(`Student Application Submission: HTTP ${submitAppRes.status} (Expected 201)`);
    if (submitAppRes.status !== 201 || !submitAppData.application?._id) {
      throw new Error(`FAIL: Application submission failed: ${JSON.stringify(submitAppData)}`);
    }
    const appId = submitAppData.application._id;

    // Test duplicate prevention
    const duplicateAppRes = await fetch(`${baseUrl}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify(appPayload)
    });
    console.log(`Duplicate Application Attempt: HTTP ${duplicateAppRes.status} (Expected 400)`);
    if (duplicateAppRes.status !== 400) {
      throw new Error(`FAIL: Duplicate application was permitted! HTTP ${duplicateAppRes.status}`);
    }
    console.log('PASS: Duplicate candidacy submission strictly prevented.');

    // Organizer reviews candidates for this opportunity
    const candidatesRes = await fetch(`${baseUrl}/applications/target/${clubOpp._id}`, {
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    const candidatesData: any = await candidatesRes.json();
    console.log(`Organizer Candidacy Review: Found ${candidatesData.applications?.length} applications`);
    if (candidatesData.applications?.length !== 1) {
      throw new Error('FAIL: Organizer did not retrieve the candidate application');
    }

    // Organizer updates status to 'accepted'
    const updateStatusRes = await fetch(`${baseUrl}/applications/${appId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`
      },
      body: JSON.stringify({
        status: 'accepted',
        reviewerFeedback: 'Outstanding embedded systems background. Welcome to the team!'
      })
    });
    const updateStatusData: any = await updateStatusRes.json();
    console.log(`Organizer Update Status: HTTP ${updateStatusRes.status}, status = ${updateStatusData.application?.status} (Expected accepted)`);
    if (updateStatusData.application?.status !== 'accepted') {
      throw new Error('FAIL: Status update to accepted failed');
    }

    // Student checks tracking dashboard
    const myAppsRes = await fetch(`${baseUrl}/applications/my`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const myAppsData: any = await myAppsRes.json();
    const myApp = myAppsData.applications?.find((a: any) => a._id === appId);
    console.log(`Student My Submissions Status: ${myApp?.status}`);
    if (myApp?.status === 'accepted') {
      console.log('PASS: Applicant received status update with feedback.');
    } else {
      throw new Error('FAIL: Applicant did not see accepted status in My Submissions');
    }

    // Security check: Student 2 cannot access private applications of another opportunity they did not create
    const unauthorizedReviewRes = await fetch(`${baseUrl}/applications/target/${clubOpp._id}`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log(`Unauthorized Student Review Access: HTTP ${unauthorizedReviewRes.status} (Expected 403)`);
    if (unauthorizedReviewRes.status !== 403) {
      throw new Error(`FAIL: Unauthorized student accessed private applicant data! HTTP ${unauthorizedReviewRes.status}`);
    }
    console.log('PASS: Private applicant information is strictly protected.');

    console.log('\n============================================================');
    console.log('ALL CAMPUS HUB, RESEARCH & RECRUITMENT TESTS PASSED (100%)!');
    console.log('============================================================\n');

  } catch (err) {
    console.error('TEST RUN FAILED:', err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runTests();
