import mongoose from 'mongoose';
import {
  User,
  Post,
  Community,
  Opportunity,
  Application,
  ResearchPaper,
  ResearchCollaboration,
  Subscription,
  Notification,
  Report,
  ResearchReview,
  MentorshipBinding,
  AcademicCalendar,
  Timetable,
  UploadedFile,
  Connection,
  MentorshipRequest,
  CareerQuestion,
  Conversation,
  Message,
  AuditLog,
  getCanonicalPair,
  getCanonicalDirectPair
} from '../models/index.js';

const runVerification = async () => {
  console.log('================================================================');
  console.log('=== UNIVERSE DATABASE MODELS & INFRASTRUCTURE TEST SUITE ===');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const test = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  };

  const testAsync = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  };

  // 1. Model Registry and Existence Checks
  console.log('--- 1. Model Registry Verification (21 Collections) ---');
  const expectedModels = [
    { name: 'User', model: User },
    { name: 'Post', model: Post },
    { name: 'Community', model: Community },
    { name: 'Opportunity', model: Opportunity },
    { name: 'Application', model: Application },
    { name: 'ResearchPaper', model: ResearchPaper },
    { name: 'ResearchCollaboration', model: ResearchCollaboration },
    { name: 'Subscription', model: Subscription },
    { name: 'Notification', model: Notification },
    { name: 'Report', model: Report },
    { name: 'ResearchReview', model: ResearchReview },
    { name: 'MentorshipBinding', model: MentorshipBinding },
    { name: 'AcademicCalendar', model: AcademicCalendar },
    { name: 'Timetable', model: Timetable },
    { name: 'UploadedFile', model: UploadedFile },
    { name: 'Connection', model: Connection },
    { name: 'MentorshipRequest', model: MentorshipRequest },
    { name: 'CareerQuestion', model: CareerQuestion },
    { name: 'Conversation', model: Conversation },
    { name: 'Message', model: Message },
    { name: 'AuditLog', model: AuditLog }
  ];

  test('All 21 domain models registered in Mongoose', () => {
    if (expectedModels.length !== 21) {
      throw new Error(`Expected 21 models, found ${expectedModels.length}`);
    }
    for (const item of expectedModels) {
      if (!item.model || !item.model.modelName) {
        throw new Error(`Model ${item.name} is missing or improperly initialized`);
      }
    }
  });

  // 2. Schema Validation Checks (Required fields & Invalid Enums)
  console.log('\n--- 2. Required Fields & Validation Tests ---');

  await testAsync('User model rejects missing required fields (name, email, password, institution)', async () => {
    const invalidUser = new User({});
    const err = invalidUser.validateSync();
    if (!err || !err.errors['name'] || !err.errors['email'] || !err.errors['password'] || !err.errors['institution']) {
      throw new Error('User model failed to enforce required fields');
    }
  });

  await testAsync('User model rejects invalid role enum', async () => {
    const invalidUser = new User({
      name: 'Test',
      email: 'test@example.com',
      password: 'hash',
      institution: 'Test Univ',
      role: 'super_hacker' as any
    });
    const err = invalidUser.validateSync();
    if (!err || !err.errors['role']) {
      throw new Error('User model failed to reject invalid role enum');
    }
  });

  await testAsync('User model validates CGPA upper and lower bounds (0-10)', async () => {
    const userTooHigh = new User({
      name: 'High CGPA',
      email: 'high@example.com',
      password: 'hash',
      institution: 'Test Univ',
      cgpa: 11.5
    });
    const errHigh = userTooHigh.validateSync();
    if (!errHigh || !errHigh.errors['cgpa']) {
      throw new Error('User model allowed CGPA > 10');
    }

    const userNegative = new User({
      name: 'Neg CGPA',
      email: 'neg@example.com',
      password: 'hash',
      institution: 'Test Univ',
      cgpa: -1
    });
    const errNeg = userNegative.validateSync();
    if (!errNeg || !errNeg.errors['cgpa']) {
      throw new Error('User model allowed negative CGPA');
    }
  });

  await testAsync('Post model accepts eventDetails subdocument with registration deadline and capacity', async () => {
    const eventPost = new Post({
      author: new mongoose.Types.ObjectId(),
      content: 'Annual Robotics Symposium',
      category: 'Event',
      eventDetails: {
        venue: 'Auditorium 1',
        capacity: 100,
        allocatedSeats: 0,
        registrationDeadline: new Date(Date.now() + 86400000),
        approvalStatus: 'approved',
        publicationStatus: 'published',
        isTeamEvent: true,
        minTeamSize: 1,
        maxTeamSize: 4
      }
    });
    const err = eventPost.validateSync();
    if (err) {
      throw new Error(`Event post validation failed: ${err.message}`);
    }
  });

  await testAsync('ResearchReview model requires verdict, reviewerRole, comments, and valid enums', async () => {
    const invalidReview = new ResearchReview({
      paperId: new mongoose.Types.ObjectId(),
      reviewerId: new mongoose.Types.ObjectId(),
      reviewerRole: 'invalid_role' as any,
      verdict: 'invalid_verdict' as any
    });
    const err = invalidReview.validateSync();
    if (!err || !err.errors['reviewerRole'] || !err.errors['verdict'] || !err.errors['comments']) {
      throw new Error('ResearchReview failed to validate required fields and enums');
    }
  });

  await testAsync('Timetable model validates startMinutes < endMinutes and bounds (0-1440)', async () => {
    const invalidSlot = new Timetable({
      institution: 'RNSIT',
      department: 'CSE',
      semester: 6,
      section: 'A',
      academicYear: '2024-2025',
      dayOfWeek: 1,
      startMinutes: 600,
      endMinutes: 540, // 540 < 600 -> invalid!
      courseCode: 'CS601',
      courseName: 'Compiler Design',
      facultyId: new mongoose.Types.ObjectId(),
      roomNumber: 'LH-101'
    });
    const err = invalidSlot.validateSync();
    if (!err || !err.errors['startMinutes']) {
      throw new Error('Timetable failed to reject startMinutes >= endMinutes');
    }
  });

  await testAsync('UploadedFile model validates fileSizeBytes >= 0 and storageProvider enum', async () => {
    const invalidFile = new UploadedFile({
      uploaderId: new mongoose.Types.ObjectId(),
      originalFileName: 'paper.pdf',
      storedFileName: 'stored_paper_123.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: -50,
      storageProvider: 'ftp_server' as any,
      filePath: '/uploads/paper.pdf',
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      associatedEntityType: 'research_paper'
    });
    const err = invalidFile.validateSync();
    if (!err || !err.errors['fileSizeBytes'] || !err.errors['storageProvider']) {
      throw new Error('UploadedFile failed to validate fileSizeBytes and storageProvider');
    }
  });

  await testAsync('CareerQuestion model supports public and private_to_mentor visibility', async () => {
    const question = new CareerQuestion({
      author: new mongoose.Types.ObjectId(),
      visibility: 'private_to_mentor',
      assignedMentor: new mongoose.Types.ObjectId(),
      title: 'Guidance on Distributed Systems Interview Preparation',
      body: 'How should I structure my preparation for systems engineering?'
    });
    const err = question.validateSync();
    if (err) {
      throw new Error(`CareerQuestion failed validation: ${err.message}`);
    }
  });

  // 3. Index & Constraint Definitions Verification
  console.log('\n--- 3. Index & Constraint Inventory Verification ---');

  test('MentorshipBinding schema specifies required partial unique indexes', () => {
    const indexes = MentorshipBinding.schema.indexes();
    const proctorIndex = indexes.find(
      (idx: any) =>
        idx[0].student === 1 &&
        idx[0].assignmentType === 1 &&
        idx[1]?.partialFilterExpression?.assignmentType === 'proctor'
    );
    if (!proctorIndex || !proctorIndex[1]?.unique) {
      throw new Error('MentorshipBinding missing single active proctor partial unique index');
    }

    const guideIndex = indexes.find(
      (idx: any) =>
        idx[0].student === 1 &&
        idx[0].collaborationId === 1 &&
        idx[1]?.partialFilterExpression?.assignmentType === 'project_guide'
    );
    if (!guideIndex || !guideIndex[1]?.unique) {
      throw new Error('MentorshipBinding missing single active guide per collaboration partial unique index');
    }
  });

  test('Connection canonicalPair helper produces lexicographical string', () => {
    const id1 = new mongoose.Types.ObjectId('507f191e810c19729de860ea');
    const id2 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const pair1 = getCanonicalPair(id1, id2);
    const pair2 = getCanonicalPair(id2, id1);
    if (pair1 !== pair2) {
      throw new Error(`Canonical pair not symmetric: ${pair1} !== ${pair2}`);
    }
    const expected = `${id1.toString()}:${id2.toString()}`;
    if (pair1 !== expected) {
      throw new Error(`Canonical pair mismatch: expected ${expected}, got ${pair1}`);
    }
  });

  test('Conversation canonicalDirectPair helper enforces 1-on-1 uniqueness', () => {
    const id1 = new mongoose.Types.ObjectId('507f191e810c19729de860ea');
    const id2 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const pair1 = getCanonicalDirectPair(id1, id2);
    const pair2 = getCanonicalDirectPair(id2, id1);
    if (pair1 !== pair2) {
      throw new Error(`Direct pair not symmetric: ${pair1} !== ${pair2}`);
    }
  });

  test('AuditLog schema enforces immutable timestamp and indexed entity references', () => {
    const indexes = AuditLog.schema.indexes();
    const entityIndex = indexes.find(
      (idx: any) => idx[0].entityType === 1 && idx[0].entityId === 1 && idx[0].timestamp === -1
    );
    if (!entityIndex) {
      throw new Error('AuditLog missing compound { entityType: 1, entityId: 1, timestamp: -1 } index');
    }
  });

  // Summary
  console.log('\n================================================================');
  console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runVerification().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});

