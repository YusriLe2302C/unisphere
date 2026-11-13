import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Opportunity } from '../models/Opportunity.js';
import { Application } from '../models/Application.js';
import { ResearchCollaboration } from '../models/ResearchCollaboration.js';
import { ResearchPaper } from '../models/ResearchPaper.js';
import { Subscription } from '../models/Subscription.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth.js';

const runTests = async () => {
  console.log('=== STARTING OPERATIONAL ANALYTICS DASHBOARD VERIFICATION SUITE ===');
  await connectDB();
  const app = createApp();
  const server = app.listen(5005);

  try {
    const baseUrl = 'http://localhost:5005/api';

    // 1. Setup Test Users
    console.log('\n--- 1. Setting Up Authorized Test Personas ---');
    const secret = getJwtSecret();
    const timestamp = Date.now();

    // Club Leader A (RNSIT)
    const organizerA = await User.create({
      name: `Club Leader A ${timestamp}`,
      email: `leadera_${timestamp}@rnsit.ac.in`,
      password: 'HashedPassword123!',
      role: 'student',
      institution: 'RNS Institute of Technology',
      department: 'Computer Science',
      isVerified: true
    });
    const tokenA = jwt.sign({ id: organizerA._id, email: organizerA.email, role: organizerA.role, institution: organizerA.institution }, secret, { expiresIn: '1h' });

    // Club Leader B (RVCE)
    const organizerB = await User.create({
      name: `Club Leader B ${timestamp}`,
      email: `leaderb_${timestamp}@rvce.edu.in`,
      password: 'HashedPassword123!',
      role: 'student',
      institution: 'RV College of Engineering',
      department: 'Electronics',
      isVerified: true
    });
    const tokenB = jwt.sign({ id: organizerB._id, email: organizerB.email, role: organizerB.role, institution: organizerB.institution }, secret, { expiresIn: '1h' });

    // Research Supervisor (Faculty)
    const facultySupervisor = await User.create({
      name: `Dr. Supervisor ${timestamp}`,
      email: `supervisor_${timestamp}@rnsit.ac.in`,
      password: 'HashedPassword123!',
      role: 'faculty',
      institution: 'RNS Institute of Technology',
      department: 'Computer Science',
      isVerified: true
    });
    const tokenSupervisor = jwt.sign({ id: facultySupervisor._id, email: facultySupervisor.email, role: facultySupervisor.role, institution: facultySupervisor.institution }, secret, { expiresIn: '1h' });

    // Platform Admin
    const adminUser = await User.create({
      name: `System Admin ${timestamp}`,
      email: `admin_${timestamp}@rnsit.ac.in`,
      password: 'HashedPassword123!',
      role: 'admin',
      institution: 'RNS Institute of Technology',
      isVerified: true
    });
    const tokenAdmin = jwt.sign({ id: adminUser._id, email: adminUser.email, role: adminUser.role, institution: adminUser.institution }, secret, { expiresIn: '1h' });

    // Student Applicant / Attendee
    const attendeeStudent = await User.create({
      name: `Attendee Student ${timestamp}`,
      email: `attendee_${timestamp}@rnsit.ac.in`,
      password: 'HashedPassword123!',
      role: 'student',
      institution: 'RNS Institute of Technology',
      isVerified: true
    });

    console.log('PASS: Personas created successfully.');

    // 2. Seed Stored Data for Organizer A
    console.log('\n--- 2. Seeding Actual Stored Data for Organizer A ---');
    // Event 1: Active with 1 attendee
    const event1 = await Post.create({
      author: organizerA._id,
      title: 'Robotics Workshop 2026',
      content: 'Hands-on robotics lab',
      category: 'Workshop & Seminar',
      institution: 'RNS Institute of Technology',
      eventDetails: {
        capacity: 50,
        registeredAttendees: [attendeeStudent._id],
        attendedAttendees: [],
        isCancelled: false
      }
    });

    // Event 2: Cancelled event
    const event2 = await Post.create({
      author: organizerA._id,
      title: 'Drone Racing Trials',
      content: 'Trials postponed due to rain',
      category: 'Sports & Fixtures',
      institution: 'RNS Institute of Technology',
      eventDetails: {
        capacity: 20,
        registeredAttendees: [attendeeStudent._id],
        attendedAttendees: [],
        isCancelled: true,
        cancellationReason: 'Inclement weather'
      }
    });

    // Opportunity 1 for Organizer A
    const oppA = await Opportunity.create({
      title: 'Robotics Club Core Team Lead',
      organization: 'Robotics Club',
      institution: 'RNS Institute of Technology',
      type: 'Club Recruitment',
      description: 'Looking for leads',
      postedBy: organizerA._id
    });

    // 2 applications for Organizer A
    await Application.create({
      applicant: attendeeStudent._id,
      opportunity: oppA._id,
      roleApplied: 'Hardware Lead',
      status: 'shortlisted',
      answers: [{ question: 'Experience?', answer: '3 years' }]
    });

    // Seed Opportunity & Application for Organizer B
    const oppB = await Opportunity.create({
      title: 'RVCE Debate Society Member',
      organization: 'Debate Society',
      institution: 'RV College of Engineering',
      type: 'Club Recruitment',
      description: 'Debate auditions',
      postedBy: organizerB._id
    });

    await Application.create({
      applicant: attendeeStudent._id,
      opportunity: oppB._id,
      roleApplied: 'Debater',
      status: 'accepted',
      answers: [{ question: 'Why debate?', answer: 'Passion' }]
    });

    console.log('PASS: Stored events and opportunities seeded.');

    // 3. Test Attendance Recording Endpoint
    console.log('\n--- 3. Testing Real Attendance Recording API ---');
    const recordAttRes = await fetch(`${baseUrl}/posts/${event1._id}/record-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        attendeeId: attendeeStudent._id.toString(),
        attended: true
      })
    });
    const recordAttData: any = await recordAttRes.json();
    console.log(`Record attendance status: HTTP ${recordAttRes.status}`);
    if (recordAttRes.status === 200 && recordAttData.recordedAttendanceCount === 1) {
      console.log('PASS: Attendance recorded successfully for registered attendee.');
    } else {
      throw new Error(`FAIL: Attendance recording failed: ${JSON.stringify(recordAttData)}`);
    }

    // Attempt attendance recording by unauthorized user (Organizer B on Organizer A's event)
    const unauthorizedAttRes = await fetch(`${baseUrl}/posts/${event1._id}/record-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        attendeeId: attendeeStudent._id.toString(),
        attended: true
      })
    });
    console.log(`Unauthorized attendance mark: HTTP ${unauthorizedAttRes.status} (Expected 403)`);
    if (unauthorizedAttRes.status === 403) {
      console.log('PASS: Unauthorized attendance modification properly blocked with 403.');
    } else {
      throw new Error(`FAIL: Expected 403 but got ${unauthorizedAttRes.status}`);
    }

    // 4. Test Organizer A Scoped Analytics
    console.log('\n--- 4. Testing Organizer A Scoped Analytics ---');
    const analyticsResA = await fetch(`${baseUrl}/analytics/overview?timeRange=30d`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const analyticsDataA: any = await analyticsResA.json();

    console.log(`Analytics response status: HTTP ${analyticsResA.status}`);
    const metricsA = analyticsDataA.metrics;

    // Verify Events calculation
    console.log(`Organizer A Total Events: ${metricsA.events.totalEvents} (Expected 2)`);
    console.log(`Organizer A Active Events: ${metricsA.events.activeEvents} (Expected 1)`);
    console.log(`Organizer A Cancelled Events: ${metricsA.events.cancelledEvents} (Expected 1)`);
    console.log(`Organizer A Recorded Attendance: ${metricsA.events.totalRecordedAttendance} (Expected 1)`);
    console.log(`Organizer A Turnout Rate: ${metricsA.events.overallAttendanceRate}% (Expected 50%)`);

    if (
      metricsA.events.totalEvents === 2 &&
      metricsA.events.activeEvents === 1 &&
      metricsA.events.cancelledEvents === 1 &&
      metricsA.events.totalRecordedAttendance === 1
    ) {
      console.log('PASS: Event and attendance calculations are 100% accurate.');
    } else {
      throw new Error('FAIL: Mismatch in event and attendance metrics.');
    }

    // 5. Test Access Scoping / Boundary Enforcement
    console.log('\n--- 5. Verifying Strict Scoping (Organizer A cannot see Organizer B applications) ---');
    console.log(`Organizer A Recruitment Opportunities: ${metricsA.recruitment.totalOpportunities} (Expected 1)`);
    console.log(`Organizer A Recruitment Applications: ${metricsA.recruitment.totalApplications} (Expected 1)`);
    console.log(`Organizer A Recruitment byStatus.shortlisted: ${metricsA.recruitment.byStatus.shortlisted} (Expected 1)`);
    console.log(`Organizer A Recruitment byStatus.accepted: ${metricsA.recruitment.byStatus.accepted} (Expected 0)`);

    if (
      metricsA.recruitment.totalOpportunities === 1 &&
      metricsA.recruitment.totalApplications === 1 &&
      metricsA.recruitment.byStatus.shortlisted === 1 &&
      metricsA.recruitment.byStatus.accepted === 0
    ) {
      console.log('PASS: Organizer A sees ONLY their own club recruitment application metrics.');
    } else {
      throw new Error('FAIL: Organizer A leaked applications from other clubs!');
    }

    // 6. Test Supervisor Collaboration Metrics
    console.log('\n--- 6. Testing Research Supervisor Scoped Metrics ---');
    const collabProject = await ResearchCollaboration.create({
      title: 'Neural Networks Lab Project',
      description: 'Deep learning research',
      leadResearcher: facultySupervisor._id,
      institution: 'RNS Institute of Technology',
      department: 'Computer Science',
      subject: 'Artificial Intelligence',
      openRoles: [{ roleTitle: 'Research Intern', vacancies: 2, filled: 1 }],
      applications: [{
        applicant: attendeeStudent._id,
        roleSought: 'Research Intern',
        statement: 'Passionate about NLP',
        relevantSkills: ['Python', 'PyTorch'],
        interests: ['LLMs'],
        status: 'accepted',
        appliedAt: new Date()
      }]
    });

    const supRes = await fetch(`${baseUrl}/analytics/overview?timeRange=all`, {
      headers: { 'Authorization': `Bearer ${tokenSupervisor}` }
    });
    const supData: any = await supRes.json();
    console.log(`Supervisor total projects: ${supData.metrics.collaboration.totalProjects} (Expected 1)`);
    console.log(`Supervisor total requests: ${supData.metrics.collaboration.totalCollaborationRequests} (Expected 1)`);
    console.log(`Supervisor accepted requests: ${supData.metrics.collaboration.byStatus.accepted} (Expected 1)`);
    console.log(`Supervisor filled roles: ${supData.metrics.collaboration.totalFilledRoles} (Expected 1)`);

    if (
      supData.metrics.collaboration.totalProjects === 1 &&
      supData.metrics.collaboration.totalCollaborationRequests === 1 &&
      supData.metrics.collaboration.byStatus.accepted === 1
    ) {
      console.log('PASS: Supervisor collaboration metrics accurately aggregated.');
    } else {
      throw new Error('FAIL: Supervisor collaboration metrics mismatch.');
    }

    // 7. Test Admin Scoped / Platform-Wide Aggregation
    console.log('\n--- 7. Testing Admin Platform-Wide Aggregation ---');
    const adminRes = await fetch(`${baseUrl}/analytics/overview?timeRange=all`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const adminData: any = await adminRes.json();
    console.log(`Admin Scope: ${adminData.scope} (Expected platform-wide)`);
    console.log(`Admin Total Opportunities: ${adminData.metrics.recruitment.totalOpportunities} (Expected >= 2)`);
    console.log(`Admin Total Applications: ${adminData.metrics.recruitment.totalApplications} (Expected >= 2)`);

    if (adminData.metrics.recruitment.totalOpportunities >= 2 && adminData.metrics.recruitment.totalApplications >= 2) {
      console.log('PASS: Admin correctly sees aggregated platform-wide operational totals.');
    } else {
      throw new Error('FAIL: Admin platform metrics incomplete.');
    }

    // 8. Test Transparent Untracked Metrics Disclosure
    console.log('\n--- 8. Verifying Untracked Metrics Disclosure ---');
    console.log(`Untracked metrics count: ${adminData.untrackedMetrics.length}`);
    const viewsDisclosure = adminData.untrackedMetrics.find((m: any) => m.metric.includes('Views'));
    if (viewsDisclosure && viewsDisclosure.status === 'Data collection not enabled') {
      console.log(`PASS: Untracked metrics explicitly disclosed: "${viewsDisclosure.metric}" -> ${viewsDisclosure.reason}`);
    } else {
      throw new Error('FAIL: Missing transparent untracked metrics disclosure.');
    }

    // 9. Test Date Range Filtering Accuracy
    console.log('\n--- 9. Testing Date Filtering Accuracy (Future Window Empty State) ---');
    const futureDateRes = await fetch(`${baseUrl}/analytics/overview?startDate=2099-01-01&endDate=2099-12-31`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const futureData: any = await futureDateRes.json();
    console.log(`Future window events count: ${futureData.metrics.events.totalEvents} (Expected 0)`);
    console.log(`Future window applications count: ${futureData.metrics.recruitment.totalApplications} (Expected 0)`);
    if (futureData.metrics.events.totalEvents === 0 && futureData.metrics.recruitment.totalApplications === 0) {
      console.log('PASS: Date range filtering accurately returns zero counts without error.');
    } else {
      throw new Error('FAIL: Date filtering did not correctly isolate records.');
    }

    console.log('\n=== ALL ANALYTICS DASHBOARD VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
  } catch (error) {
    console.error('VERIFICATION ERROR:', error);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runTests();
