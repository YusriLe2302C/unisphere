import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { getJwtSecret } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { MentorshipBinding } from '../models/MentorshipBinding.js';
import { ResearchPaper } from '../models/ResearchPaper.js';
import { ResearchReview } from '../models/ResearchReview.js';
import { ResearchCollaboration } from '../models/ResearchCollaboration.js';
import { Notification } from '../models/Notification.js';

const uri = process.env.RESEARCH_WORKFLOW_TEST_DB_URI;
if (!uri) throw new Error('Set RESEARCH_WORKFLOW_TEST_DB_URI to a disposable MongoDB database before running this test.');

async function run() {
  process.env.MONGODB_URI = uri;
  await connectDB(uri);
  await Promise.all([User.init(), MentorshipBinding.init(), ResearchPaper.init(), ResearchReview.init(), ResearchCollaboration.init(), Notification.init()]);
  const app = createApp(); const server = app.listen(5011);
  const secret = getJwtSecret();
  const people: any = {};
  try {
    for (const [key, role, responsibilities = []] of [
      ['student','student',[]], ['proctor','faculty',[]], ['guide1','faculty',[]], ['guide2','faculty',[]],
      ['other','faculty',[]], ['otherProctor','faculty',['proctor']], ['facultyAuthor','faculty',[]], ['authority','dean',[]], ['pi','faculty',[]]
    ] as any[]) {
      people[key] = await User.create({ name: key, email: `${key}@research-test.invalid`, password: 'unused-password-hash', role, institution: 'Research Test College', department: 'Science', responsibilities, isVerified: true });
    }
    people.foreignProctor = await User.create({ name: 'foreignProctor', email: 'foreignProctor@research-test.invalid', password: 'unused-password-hash', role: 'faculty', institution: 'Other Research College', department: 'Science', responsibilities: ['proctor'], isVerified: true });
    const token = (person: any) => jwt.sign({ id: person._id.toString(), ver: person.tokenVersion, email: person.email, role: person.role, institution: person.institution, name: person.name }, secret, { expiresIn: '1h' });
    const req = async (path: string, who: any, method = 'GET', data?: any) => {
      const response = await fetch(`http://localhost:5011/api/research${path}`, { method, headers: { Authorization: `Bearer ${token(who)}`, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
      return { status: response.status, body: await response.json() as any };
    };
    const assign = async (student: any, faculty: any, type: string, collaborationId?: string) => req('/assignments', people.authority, 'POST', { studentId: student._id, facultyId: faculty._id, assignmentType: type, collaborationId });
    const createPendingPaper = (title: string) => ResearchPaper.create({
      title, abstract: 'Abstract', authors: [{ name: people.student.name, user: people.student._id }],
      publicationType: 'Preprint', subject: 'Physics', institution: people.student.institution,
      visibility: 'institution-only', submittedBy: people.student._id, isStudentSubmission: true,
      lifecycleStatus: 'pending_proctor', assignedProctorId: people.proctor._id,
      assignedProjectGuideId: people.guide1._id,
      assignedProjectGuideIds: [people.guide1._id, people.guide2._id, people.other._id],
      revisionRound: 1,
      reviewHistory: [{ revisionRound: 1, submittedAt: new Date(), submittedBy: people.student._id }],
    });

    const collaboration = await ResearchCollaboration.create({ title: 'Workflow project', description: 'Test', leadResearcher: people.pi._id, institution: people.pi.institution, department: 'Science', subject: 'Physics', openRoles: [{ roleTitle: 'Analyst', vacancies: 1 }], visibility: 'public', status: 'open' });
    const submitted = await req('/', people.student, 'POST', { title: 'Student study', abstract: 'Abstract', subject: 'Physics', collaborationId: collaboration._id });
    const paperId = submitted.body.paper?._id;
    if (submitted.status !== 201 || submitted.body.paper.lifecycleStatus !== 'published' || submitted.body.paper.visibility !== 'institution-only') throw new Error('Student paper was not published directly with institution-only visibility');
    const proctorQueue = await req('/papers/mine', people.otherProctor);
    if (proctorQueue.status !== 200 || proctorQueue.body.papers.some((paper: any) => paper._id === paperId)) throw new Error('Directly published paper appeared in a Proctor review queue');
    const nonProctorQueue = await req('/papers/mine', people.facultyAuthor);
    if (nonProctorQueue.status !== 200 || nonProctorQueue.body.papers.some((paper: any) => paper._id === paperId)) throw new Error('Directly published paper appeared in an unassigned faculty queue');
    const foreignProctorQueue = await req('/papers/mine', people.foreignProctor);
    if (foreignProctorQueue.status !== 200 || foreignProctorQueue.body.papers.some((paper: any) => paper._id === paperId)) throw new Error('Foreign Proctor saw the student paper in their queue');
    const foreignPublications = await req('/', people.foreignProctor);
    if (foreignPublications.status !== 200 || foreignPublications.body.papers.some((paper: any) => paper._id === paperId)) throw new Error('Institution-only student publication was listed outside its institution');
    const detail = await req(`/${paperId}`, people.otherProctor);
    if (detail.status !== 200) throw new Error(`Institution member could not open the publication: ${detail.status}`);
    const facultyNotifications = await Notification.find({ entityId: paperId, type: 'system' }).select('recipient');
    const notifiedIds = new Set(facultyNotifications.map(notification => notification.recipient.toString()));
    for (const key of ['proctor', 'guide1', 'guide2', 'other', 'otherProctor', 'facultyAuthor', 'pi']) {
      if (!notifiedIds.has(people[key]._id.toString())) throw new Error(`Faculty member ${key} was not notified about the publication`);
    }
    if (notifiedIds.has(people.foreignProctor._id.toString())) throw new Error('Faculty outside the institution was notified');
    if ((await req(`/papers/${paperId}/reviews`, people.otherProctor, 'POST', { verdict: 'approved', comments: 'No review required' })).status !== 409) throw new Error('Directly published student paper accepted a review');

    if ((await assign(people.student, people.proctor, 'proctor')).status !== 201) throw new Error('Proctor assignment failed');
    if ((await assign(people.student, people.guide1, 'project_guide', collaboration._id.toString())).status !== 201) throw new Error('Guide 1 assignment failed');
    if ((await assign(people.student, people.guide2, 'project_guide', collaboration._id.toString())).status !== 201) throw new Error('Guide 2 assignment failed');
    const duplicateProctor = await assign(people.student, people.other, 'proctor');
    if (duplicateProctor.status !== 409) throw new Error(`Duplicate active proctor assignment was accepted or returned unexpected status ${duplicateProctor.status}: ${JSON.stringify(duplicateProctor.body)}`);
    const assigned = await req(`/assignments?studentId=${people.student._id}`, people.authority);
    if (assigned.status !== 200 || !Array.isArray(assigned.body.assignments)) throw new Error(`Assignment history request failed: ${assigned.status} ${JSON.stringify(assigned.body)}`);
    const guide2Binding = assigned.body.assignments.find((x: any) => x.assignmentType === 'project_guide' && x.faculty._id === people.guide2._id.toString());
    if (!guide2Binding) throw new Error('Guide assignment missing from history');
    const reassigned = await req(`/assignments/${guide2Binding._id}/reassign`, people.authority, 'POST', { facultyId: people.other._id });
    if (reassigned.status !== 201 || reassigned.body.previousAssignment.status !== 'transferred') throw new Error(`Guide reassignment failed: ${reassigned.status} ${JSON.stringify(reassigned.body)}`);
    if ((await assign(people.student, people.guide2, 'project_guide', collaboration._id.toString())).status !== 201) throw new Error('Replacement guide setup failed');

    const workflowPaper = await createPendingPaper('Legacy review workflow');
    const workflowPaperId = workflowPaper._id.toString();
    const workflowProctorQueue = await req('/papers/mine', people.otherProctor);
    if (workflowProctorQueue.status !== 200 || !workflowProctorQueue.body.papers.some((paper: any) => paper._id === workflowPaperId)) throw new Error('Institution Proctor could not see a legacy pending paper');
    if ((await req(`/${workflowPaperId}`, people.foreignProctor)).status !== 404) throw new Error('Foreign Proctor could open an institution-only pending paper');
    if ((await req(`/papers/${workflowPaperId}/reviews`, people.foreignProctor, 'POST', { verdict: 'approved', comments: 'Outside institution' })).status !== 403) throw new Error('Foreign Proctor review was accepted');
    if ((await req(`/papers/${workflowPaperId}/reviews`, people.other, 'POST', { verdict: 'approved', comments: 'Nope' })).status !== 403) throw new Error('Unassigned non-Proctor review was accepted');
    if ((await req(`/papers/${workflowPaperId}/reviews`, people.otherProctor, 'POST', { verdict: 'approved', comments: 'Pass' })).status !== 201) throw new Error('Unassigned institutional Proctor approval failed');
    const duplicateReview = await req(`/papers/${workflowPaperId}/reviews`, people.otherProctor, 'POST', { verdict: 'approved', comments: 'Duplicate' });
    if (![403,409].includes(duplicateReview.status)) throw new Error(`Duplicate review was accepted: ${duplicateReview.status}`);
    if ((await req(`/papers/${workflowPaperId}/reviews`, people.guide1, 'POST', { verdict: 'approved', comments: 'Pass' })).status !== 201) throw new Error('Guide 1 approval failed');
    const prematurePublish = await req(`/papers/${workflowPaperId}/publish`, people.authority, 'POST', {});
    if (prematurePublish.status !== 409) throw new Error(`Paper published before all guide approvals: ${prematurePublish.status} ${JSON.stringify(prematurePublish.body)}`);
    if ((await req(`/papers/${workflowPaperId}/reviews`, people.guide2, 'POST', { verdict: 'approved', comments: 'Pass' })).status !== 201) throw new Error('Guide 2 approval failed');
    if ((await req(`/papers/${workflowPaperId}/reviews`, people.other, 'POST', { verdict: 'approved', comments: 'Pass' })).status !== 201) throw new Error('Reassigned Project Guide approval failed');
    const published = await req(`/papers/${workflowPaperId}/publish`, people.authority, 'POST', {});
    if (published.status !== 200) throw new Error(`Fully approved paper failed publication: ${published.status} ${JSON.stringify(published.body)}`);

    const rejected = await createPendingPaper('Legacy rejected study');
    const rejectedId = rejected._id.toString();
    await req(`/papers/${rejectedId}/reviews`, people.proctor, 'POST', { verdict: 'rejected', comments: 'Needs redesign' });
    const resubmitted = await req(`/papers/${rejectedId}/resubmit`, people.student, 'POST', {});
    if (resubmitted.status !== 200 || resubmitted.body.paper.lifecycleStatus !== 'published' || resubmitted.body.paper.visibility !== 'institution-only') throw new Error('Rejected work was not published directly on resubmission');
    const resubmissionNotifications = await Notification.find({ entityId: `${rejectedId}:revision:${resubmitted.body.revisionRound}`, type: 'system' }).select('recipient');
    const resubmittedFacultyIds = new Set(resubmissionNotifications.map(notification => notification.recipient.toString()));
    for (const key of ['proctor', 'guide1', 'guide2', 'other', 'otherProctor', 'facultyAuthor', 'pi']) {
      if (!resubmittedFacultyIds.has(people[key]._id.toString())) throw new Error(`Faculty member ${key} was not notified about the published resubmission`);
    }
    if ((await req(`/papers/${rejectedId}/reviews`, people.otherProctor, 'POST', { verdict: 'changes_requested', comments: 'No review required' })).status !== 409) throw new Error('Published resubmission accepted a review');

    const facultyPaper = await req('/', people.facultyAuthor, 'POST', { title: 'Faculty work', abstract: 'Abstract', subject: 'Physics' });
    if (facultyPaper.status !== 201 || facultyPaper.body.paper.lifecycleStatus !== 'published') throw new Error('Faculty direct publication failed');
    if ((await req(`/papers/${facultyPaper.body.paper._id}/publish`, people.other, 'POST', {})).status !== 403) throw new Error('Unauthorized direct publication succeeded');

    const collab = await req('/collaborations', people.pi, 'POST', { title: 'Open team', description: 'Project', subject: 'Physics', openRoles: [{ roleTitle: 'Analyst', vacancies: 1 }] });
    const app = await req(`/collaborations/${collab.body.collaboration._id}/apply`, people.student, 'POST', { roleSought: 'Analyst', statement: 'Interested' });
    const appId = app.body.application?._id;
    if ((await req(`/collaborations/${collab.body.collaboration._id}/applications/${appId}/review`, people.other, 'POST', { status: 'accepted' })).status !== 403) throw new Error('Unauthorized collaboration decision succeeded');
    const acceptedCollab = await req(`/collaborations/${collab.body.collaboration._id}/applications/${appId}/review`, people.pi, 'POST', { status: 'accepted' });
    if (acceptedCollab.status !== 200) throw new Error(`Authorized collaboration decision failed: ${acceptedCollab.status} ${JSON.stringify(acceptedCollab.body)}`);
    const assignmentHistory = await req(`/assignments?studentId=${people.student._id}`, people.authority);
    if (assignmentHistory.body.assignments.length < 3) throw new Error('Assignment history is incomplete');
    console.log('PASS: research workflow, reassignment-ready history, dual approvals, resubmission, direct faculty publication, collaboration authorization');
  } finally {
    server.close();
    await Promise.all([Notification.deleteMany({ recipient: { $in: Object.values(people).map((person: any) => person._id) } }), ResearchReview.deleteMany({}), ResearchPaper.deleteMany({}), ResearchCollaboration.deleteMany({}), MentorshipBinding.deleteMany({}), User.deleteMany({ email: /@research-test\.invalid$/ })]);
    await mongoose.connection.close();
  }
}
run().catch(err => { console.error(err); process.exitCode = 1; });
