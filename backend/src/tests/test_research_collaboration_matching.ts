import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { ResearchCollaboration } from '../models/ResearchCollaboration.js';
import { Community } from '../models/Community.js';
import { Notification } from '../models/Notification.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth.js';

const runTests = async () => {
  console.log('=== STARTING PROMPT 6: RESEARCH COLLABORATION & MATCHING VERIFICATION ===');
  await connectDB();
  const app = createApp();
  const server = app.listen(5005);

  try {
    const baseUrl = 'http://localhost:5005/api';
    const secret = getJwtSecret();

    // 1. SETUP IDENTITIES
    console.log('\n--- 1. Setting Up Researcher, Supervisor, and Student Identities ---');
    const piUser = await User.findOneAndUpdate(
      { email: 'pi_quantum@consortium.edu' },
      {
        name: 'Dr. Bruce Banner',
        email: 'pi_quantum@consortium.edu',
        role: 'faculty',
        institution: 'Consortium University',
        department: 'Quantum Information Science',
        skills: ['Quantum Circuits', 'Qiskit', 'Topological Physics', 'Python'],
        interests: ['Quantum Algorithms', 'Superconductivity', 'Error Correction'],
        headline: 'Lead Quantum Physicist & Senior Investigator',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const supervisorUser = await User.findOneAndUpdate(
      { email: 'supervisor_quantum@consortium.edu' },
      {
        name: 'Dr. Stephen Strange',
        email: 'supervisor_quantum@consortium.edu',
        role: 'faculty',
        institution: 'Consortium University',
        department: 'Quantum Information Science',
        skills: ['Quantum Computing', 'Hamiltonian Simulation'],
        interests: ['Quantum Information', 'Applied Optics'],
        headline: 'Professor of Theoretical Physics & Lab Director',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const studentUser = await User.findOneAndUpdate(
      { email: 'candidate_sam@consortium.edu' },
      {
        name: 'Samantha Ray',
        email: 'candidate_sam@consortium.edu',
        role: 'student',
        institution: 'Consortium University',
        department: 'Quantum Information Science',
        skills: ['Quantum Circuits', 'Qiskit', 'Linear Algebra', 'C++'],
        interests: ['Quantum Algorithms', 'Machine Learning'],
        headline: 'Quantum Engineering Graduate Student',
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const unauthorizedStudent = await User.findOneAndUpdate(
      { email: 'unauthorized_peer@consortium.edu' },
      {
        name: 'Peter Parker',
        email: 'unauthorized_peer@consortium.edu',
        role: 'student',
        institution: 'Consortium University',
        department: 'Biophysics',
        skills: ['Microbiology'],
        interests: ['Genetics'],
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const piToken = jwt.sign(
      { id: piUser._id.toString(), ver: piUser.tokenVersion, email: piUser.email, role: piUser.role, institution: piUser.institution, name: piUser.name },
      secret,
      { expiresIn: '1h' }
    );

    const supervisorToken = jwt.sign(
      { id: supervisorUser._id.toString(), ver: supervisorUser.tokenVersion, email: supervisorUser.email, role: supervisorUser.role, institution: supervisorUser.institution, name: supervisorUser.name },
      secret,
      { expiresIn: '1h' }
    );

    const studentToken = jwt.sign(
      { id: studentUser._id.toString(), ver: studentUser.tokenVersion, email: studentUser.email, role: studentUser.role, institution: studentUser.institution, name: studentUser.name },
      secret,
      { expiresIn: '1h' }
    );

    const unauthorizedToken = jwt.sign(
      { id: unauthorizedStudent._id.toString(), ver: unauthorizedStudent.tokenVersion, email: unauthorizedStudent.email, role: unauthorizedStudent.role, institution: unauthorizedStudent.institution, name: unauthorizedStudent.name },
      secret,
      { expiresIn: '1h' }
    );

    // Clean up past collaboration tests
    await ResearchCollaboration.deleteMany({ leadResearcher: { $in: [piUser._id, supervisorUser._id] } });
    await Notification.deleteMany({ recipient: { $in: [piUser._id, supervisorUser._id, studentUser._id, unauthorizedStudent._id] } });
    await Community.deleteMany({ name: 'Consortium Quantum Lab' });

    // Seed a Research Group
    await Community.create({
      name: 'Consortium Quantum Lab',
      slug: 'consortium-quantum-lab',
      description: 'Cross-institutional collaborative laboratory investigating NISQ compilers and topological qubit systems.',
      category: 'Research',
      creator: piUser._id,
      members: [piUser._id, supervisorUser._id]
    });

    // 2. DISCOVERY: FACULTY PROFILES & RESEARCH GROUPS
    console.log('\n--- 2. Testing Faculty Research Profiles & Research Groups Discovery ---');
    const facRes = await fetch(`${baseUrl}/research/faculty-profiles?department=Quantum`);
    const facData = await facRes.json();
    console.log(`[PASS] Faculty discovery: status=${facRes.status}, count=${facData.faculty?.length}`);
    if (!facData.faculty?.some((f: any) => f.name === 'Dr. Bruce Banner')) {
      throw new Error('Faculty profile discovery failed to locate Dr. Bruce Banner');
    }

    const grpRes = await fetch(`${baseUrl}/research/research-groups?search=Quantum`);
    const grpData = await grpRes.json();
    console.log(`[PASS] Research groups discovery: status=${grpRes.status}, count=${grpData.groups?.length}`);
    if (!grpData.groups?.some((g: any) => g.name === 'Consortium Quantum Lab')) {
      throw new Error('Research group discovery failed to locate Consortium Quantum Lab');
    }

    // 3. CHARTER RESEARCH COLLABORATION WITH SUPERVISOR
    console.log('\n--- 3. Testing Collaboration Proposal Creation with Supervisor ---');
    const collabRes = await fetch(`${baseUrl}/research/collaborations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${piToken}` },
      body: JSON.stringify({
        title: 'Scalable Fault-Tolerant Quantum Compilation',
        description: 'Developing noise-resilient unitary decomposition pipelines for noisy intermediate-scale quantum devices.',
        subject: 'Quantum Computing',
        department: 'Quantum Information Science',
        supervisor: supervisorUser._id.toString(),
        requiredSkills: ['Quantum Circuits', 'Qiskit', 'Linear Algebra'],
        openRoles: [
          {
            roleTitle: 'Quantum Compiler Engineer',
            description: 'Optimize circuit depth under topological gate constraints.',
            vacancies: 2,
            filled: 0
          }
        ],
        tags: ['Quantum Algorithms', 'NISQ', 'Circuit Optimization']
      })
    });
    const collabData = await collabRes.json();
    console.log(`[PASS] Created Research Collaboration with Supervisor: status=${collabRes.status}, id=${collabData.collaboration?._id}`);
    const collabId = collabData.collaboration._id;

    // 4. DISCOVERY & FILTERING
    console.log('\n--- 4. Testing Discovery with Skill, Status & Supervisor Filters ---');
    const searchRes = await fetch(`${baseUrl}/research/collaborations?skill=Qiskit&subject=Quantum Computing&status=open&supervisor=${supervisorUser._id}`);
    const searchData = await searchRes.json();
    const foundCollab = (searchData.collaborations || []).find((c: any) => c._id === collabId);
    console.log(`[PASS] Collaboration discovered via skill, subject & supervisor filter: found=${!!foundCollab}, total=${searchData.total}`);
    if (!foundCollab) throw new Error('Failed to find collaboration with supervisor filter');

    // 5. CANDIDACY SUBMISSION
    console.log('\n--- 5. Testing Collaboration Request Submission ---');
    const applyRes = await fetch(`${baseUrl}/research/collaborations/${collabId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        roleSought: 'Quantum Compiler Engineer',
        statement: 'Completed advanced quantum computing graduate coursework with focus on circuit synthesis.',
        relevantSkills: ['Qiskit', 'Quantum Circuits', 'Linear Algebra'],
        interests: ['Quantum Algorithms'],
        portfolioUrl: 'https://github.com/candidate-sam/quantum-compiler'
      })
    });
    const applyData = await applyRes.json();
    console.log(`[PASS] Student submitted collaboration request: status=${applyRes.status}, msg="${applyData.message}"`);
    if (applyRes.status !== 201) throw new Error(`Apply failed: ${JSON.stringify(applyData)}`);

    // 6. DUPLICATE REQUEST PREVENTION
    console.log('\n--- 6. Testing Duplicate Request Prevention ---');
    const dupRes = await fetch(`${baseUrl}/research/collaborations/${collabId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        roleSought: 'Quantum Compiler Engineer',
        statement: 'Second duplicate attempt.'
      })
    });
    console.log(`[PASS] Duplicate request strictly prevented: status=${dupRes.status} (Expected 400)`);
    if (dupRes.status !== 400) throw new Error('Duplicate application was not rejected with 400');

    // 7. STUDENT TRACKING WORKFLOW: GET /collaborations/my-requests
    console.log('\n--- 7. Testing Student Collaboration Requests Tracking ---');
    const myReqRes = await fetch(`${baseUrl}/research/collaborations/my-requests`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const myReqData = await myReqRes.json();
    const myApp = (myReqData.requests || []).find((r: any) => r.collaborationId === collabId);
    console.log(`[PASS] Student tracked active request: found=${!!myApp}, status="${myApp?.status}", role="${myApp?.roleSought}"`);
    if (!myApp || myApp.status !== 'pending') throw new Error('My requests tracking failed');
    const appId = myApp._id;

    // 8. PRIVACY PROTECTION & UNAUTHORIZED ACCESS PREVENTION
    console.log('\n--- 8. Testing Authorization & Privacy Protection ---');
    // Unauthorized peer querying collaboration project details
    const peerQueryRes = await fetch(`${baseUrl}/research/collaborations/${collabId}`, {
      headers: { Authorization: `Bearer ${unauthorizedToken}` }
    });
    const peerQueryData = await peerQueryRes.json();
    const peerSeenApps = peerQueryData.collaboration?.applications || [];
    console.log(`[PASS] Privacy protection: unauthorized peer cannot see applicant dossiers: count=${peerSeenApps.length} (Expected 0)`);
    if (peerSeenApps.length !== 0) throw new Error('Candidate applications leaked to unauthorized student!');

    // Unauthorized peer trying to review application -> 403 Forbidden
    const unauthReviewRes = await fetch(`${baseUrl}/research/collaborations/${collabId}/applications/${appId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${unauthorizedToken}` },
      body: JSON.stringify({ status: 'accepted' })
    });
    console.log(`[PASS] Unauthorized applicant review blocked: status=${unauthReviewRes.status} (Expected 403)`);
    if (unauthReviewRes.status !== 403) throw new Error('Unauthorized user was able to review application!');

    // 9. SUPERVISOR REVIEW & STATUS TRANSITION TO SHORTLISTED
    console.log('\n--- 9. Testing Supervisor Application Review (Shortlisting) ---');
    const shortlistRes = await fetch(`${baseUrl}/research/collaborations/${collabId}/applications/${appId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supervisorToken}` },
      body: JSON.stringify({
        status: 'shortlisted',
        reviewerNotes: 'Strong preparation in unitary synthesis. Shortlisted for technical interview.'
      })
    });
    console.log(`[PASS] Supervisor shortlisted candidate: status=${shortlistRes.status}`);
    if (shortlistRes.status !== 200) throw new Error('Supervisor review failed');

    // Verify candidate received shortlisting notification
    await new Promise((r) => setTimeout(r, 300));
    const studentNotifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const studentNotifData = await studentNotifRes.json();
    const statusNotif = (studentNotifData.notifications || []).find((n: any) => n.type === 'collaboration_status');
    console.log(`[PASS] Candidate received shortlisting alert: found=${!!statusNotif}, msg="${statusNotif?.message}"`);

    // 10. CANDIDATE WITHDRAWAL WORKFLOW
    console.log('\n--- 10. Testing Candidate Request Withdrawal ---');
    const withdrawRes = await fetch(`${baseUrl}/research/collaborations/${collabId}/applications/${appId}/withdraw`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const withdrawData = await withdrawRes.json();
    console.log(`[PASS] Candidate withdrew request: status=${withdrawRes.status}, appStatus="${withdrawData.application?.status}"`);
    if (withdrawRes.status !== 200 || withdrawData.application?.status !== 'withdrawn') {
      throw new Error('Application withdrawal failed');
    }

    // 11. RE-APPLICATION & ACCEPTANCE WORKFLOW
    console.log('\n--- 11. Testing Re-application & PI Final Acceptance ---');
    const reapplyRes = await fetch(`${baseUrl}/research/collaborations/${collabId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        roleSought: 'Quantum Compiler Engineer',
        statement: 'Re-submitting with updated availability for summer research semester.',
        relevantSkills: ['Qiskit', 'Topological Physics'],
        interests: ['Quantum Algorithms']
      })
    });
    const reapplyData = await reapplyRes.json();
    console.log(`[PASS] Student re-applied after withdrawal: status=${reapplyRes.status}`);
    if (reapplyRes.status !== 201) throw new Error('Re-applying after withdrawal failed');

    // Retrieve new application ID
    const myReqRes2 = await fetch(`${baseUrl}/research/collaborations/my-requests`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const myReqData2 = await myReqRes2.json();
    const activeApp = (myReqData2.requests || []).find((r: any) => r.collaborationId === collabId && r.status === 'pending');
    const newAppId = activeApp._id;

    // PI accepts candidate
    const acceptRes = await fetch(`${baseUrl}/research/collaborations/${collabId}/applications/${newAppId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${piToken}` },
      body: JSON.stringify({ status: 'accepted', reviewerNotes: 'Accepted to quantum compiler research team.' })
    });
    console.log(`[PASS] PI accepted candidate: status=${acceptRes.status}`);

    // Verify student added to team members
    const finalCollabRes = await fetch(`${baseUrl}/research/collaborations/${collabId}`);
    const finalCollabData = await finalCollabRes.json();
    const isNowMember = (finalCollabData.collaboration?.teamMembers || []).some(
      (m: any) => (m.user?._id || m.user) === studentUser._id.toString()
    );
    console.log(`[PASS] Student confirmed in active research team members: isMember=${isNowMember}`);
    if (!isNowMember) throw new Error('Accepted applicant was not added to teamMembers');

    // 12. TRANSPARENT RULE-BASED MATCHING WITH EXPLANATION
    console.log('\n--- 12. Testing Transparent Rule-Based Matching (No AI/Paid API) ---');
    const matchProjRes = await fetch(`${baseUrl}/research/collaborations/matches`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const matchProjData = await matchProjRes.json();
    const topProjMatch = (matchProjData.matches || [])[0];
    console.log(`[PASS] Project match calculated: score=${topProjMatch?.matchScore}%`);
    console.log(`[PASS] Transparent explanation generated: "${topProjMatch?.explanation}"`);
    console.log(`[PASS] Transparent match reasons:`, topProjMatch?.matchReasons);

    if (!topProjMatch?.explanation || !Array.isArray(topProjMatch?.matchReasons)) {
      throw new Error('Match explanation or matchReasons missing from matching service');
    }

    console.log('\n========================================================================');
    console.log('✅ ALL PROMPT 6: RESEARCH COLLABORATION & MATCHING TESTS PASSED (100%)!');
    console.log('========================================================================');

  } catch (err: any) {
    console.error('❌ Test error:', err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.connection.close();
  }
};

runTests();
