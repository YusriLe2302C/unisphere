"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_js_1 = require("../app.js");
const db_js_1 = require("../config/db.js");
const auth_js_1 = require("../middleware/auth.js");
const User_js_1 = require("../models/User.js");
const MentorshipBinding_js_1 = require("../models/MentorshipBinding.js");
const ResearchPaper_js_1 = require("../models/ResearchPaper.js");
const ResearchReview_js_1 = require("../models/ResearchReview.js");
const ResearchCollaboration_js_1 = require("../models/ResearchCollaboration.js");
const uri = process.env.RESEARCH_WORKFLOW_TEST_DB_URI;
if (!uri)
    throw new Error('Set RESEARCH_WORKFLOW_TEST_DB_URI to a disposable MongoDB database before running this test.');
async function run() {
    process.env.MONGODB_URI = uri;
    await (0, db_js_1.connectDB)(uri);
    await Promise.all([User_js_1.User.init(), MentorshipBinding_js_1.MentorshipBinding.init(), ResearchPaper_js_1.ResearchPaper.init(), ResearchReview_js_1.ResearchReview.init(), ResearchCollaboration_js_1.ResearchCollaboration.init()]);
    const app = (0, app_js_1.createApp)();
    const server = app.listen(5011);
    const secret = (0, auth_js_1.getJwtSecret)();
    const people = {};
    try {
        for (const [key, role, responsibilities = []] of [
            ['student', 'student', []], ['proctor', 'faculty', []], ['guide1', 'faculty', []], ['guide2', 'faculty', []],
            ['other', 'faculty', []], ['facultyAuthor', 'faculty', []], ['authority', 'dean', []], ['pi', 'faculty', []]
        ]) {
            people[key] = await User_js_1.User.create({ name: key, email: `${key}@research-test.invalid`, password: 'unused-password-hash', role, institution: 'Research Test College', department: 'Science', responsibilities, isVerified: true });
        }
        const token = (person) => jsonwebtoken_1.default.sign({ id: person._id.toString(), ver: person.tokenVersion, email: person.email, role: person.role, institution: person.institution, name: person.name }, secret, { expiresIn: '1h' });
        const req = async (path, who, method = 'GET', data) => {
            const response = await fetch(`http://localhost:5011/api/research${path}`, { method, headers: { Authorization: `Bearer ${token(who)}`, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
            return { status: response.status, body: await response.json() };
        };
        const assign = async (student, faculty, type, collaborationId) => req('/assignments', people.authority, 'POST', { studentId: student._id, facultyId: faculty._id, assignmentType: type, collaborationId });
        const collaboration = await ResearchCollaboration_js_1.ResearchCollaboration.create({ title: 'Workflow project', description: 'Test', leadResearcher: people.pi._id, institution: people.pi.institution, department: 'Science', subject: 'Physics', openRoles: [{ roleTitle: 'Analyst', vacancies: 1 }], visibility: 'public', status: 'open' });
        if ((await assign(people.student, people.proctor, 'proctor')).status !== 201)
            throw new Error('Proctor assignment failed');
        if ((await assign(people.student, people.guide1, 'project_guide', collaboration._id.toString())).status !== 201)
            throw new Error('Guide 1 assignment failed');
        if ((await assign(people.student, people.guide2, 'project_guide', collaboration._id.toString())).status !== 201)
            throw new Error('Guide 2 assignment failed');
        const duplicateProctor = await assign(people.student, people.other, 'proctor');
        if (duplicateProctor.status !== 409)
            throw new Error(`Duplicate active proctor assignment was accepted or returned unexpected status ${duplicateProctor.status}: ${JSON.stringify(duplicateProctor.body)}`);
        const assigned = await req(`/assignments?studentId=${people.student._id}`, people.authority);
        if (assigned.status !== 200 || !Array.isArray(assigned.body.assignments))
            throw new Error(`Assignment history request failed: ${assigned.status} ${JSON.stringify(assigned.body)}`);
        const guide2Binding = assigned.body.assignments.find((x) => x.assignmentType === 'project_guide' && x.faculty._id === people.guide2._id.toString());
        if (!guide2Binding)
            throw new Error('Guide assignment missing from history');
        const reassigned = await req(`/assignments/${guide2Binding._id}/reassign`, people.authority, 'POST', { facultyId: people.other._id });
        if (reassigned.status !== 201 || reassigned.body.previousAssignment.status !== 'transferred')
            throw new Error(`Guide reassignment failed: ${reassigned.status} ${JSON.stringify(reassigned.body)}`);
        if ((await assign(people.student, people.guide2, 'project_guide', collaboration._id.toString())).status !== 201)
            throw new Error('Replacement guide setup failed');
        const submitted = await req('/', people.student, 'POST', { title: 'Student study', abstract: 'Abstract', subject: 'Physics', collaborationId: collaboration._id });
        const paperId = submitted.body.paper?._id;
        if (submitted.status !== 201 || submitted.body.paper.lifecycleStatus !== 'pending_proctor')
            throw new Error('Student paper did not enter Proctor review');
        if ((await req(`/papers/${paperId}/reviews`, people.other, 'POST', { verdict: 'approved', comments: 'Nope' })).status !== 403)
            throw new Error('Unassigned review was accepted');
        if ((await req(`/papers/${paperId}/reviews`, people.proctor, 'POST', { verdict: 'approved', comments: 'Pass' })).status !== 201)
            throw new Error('Proctor approval failed');
        const duplicateReview = await req(`/papers/${paperId}/reviews`, people.proctor, 'POST', { verdict: 'approved', comments: 'Duplicate' });
        if (![403, 409].includes(duplicateReview.status))
            throw new Error(`Duplicate review was accepted: ${duplicateReview.status}`);
        if ((await req(`/papers/${paperId}/reviews`, people.guide1, 'POST', { verdict: 'approved', comments: 'Pass' })).status !== 201)
            throw new Error('Guide 1 approval failed');
        const prematurePublish = await req(`/papers/${paperId}/publish`, people.authority, 'POST', {});
        if (prematurePublish.status !== 409)
            throw new Error(`Paper published before all guide approvals: ${prematurePublish.status} ${JSON.stringify(prematurePublish.body)}`);
        if ((await req(`/papers/${paperId}/reviews`, people.guide2, 'POST', { verdict: 'approved', comments: 'Pass' })).status !== 201)
            throw new Error('Guide 2 approval failed');
        if ((await req(`/papers/${paperId}/reviews`, people.other, 'POST', { verdict: 'approved', comments: 'Pass' })).status !== 201)
            throw new Error('Reassigned Project Guide approval failed');
        const published = await req(`/papers/${paperId}/publish`, people.authority, 'POST', {});
        if (published.status !== 200)
            throw new Error(`Fully approved paper failed publication: ${published.status} ${JSON.stringify(published.body)}`);
        const rejected = await req('/', people.student, 'POST', { title: 'Rejected study', abstract: 'Abstract', subject: 'Physics' });
        if (rejected.status !== 201 || !rejected.body.paper)
            throw new Error(`Second student submission failed: ${rejected.status} ${JSON.stringify(rejected.body)}`);
        const rejectedId = rejected.body.paper._id;
        await req(`/papers/${rejectedId}/reviews`, people.proctor, 'POST', { verdict: 'rejected', comments: 'Needs redesign' });
        if ((await req(`/papers/${rejectedId}/resubmit`, people.student, 'POST', {})).status !== 200)
            throw new Error('Rejected work resubmission failed');
        if ((await req(`/papers/${rejectedId}/reviews`, people.proctor, 'POST', { verdict: 'changes_requested', comments: 'Revise method' })).status !== 201)
            throw new Error('Proctor changes requested failed');
        const facultyPaper = await req('/', people.facultyAuthor, 'POST', { title: 'Faculty work', abstract: 'Abstract', subject: 'Physics' });
        if (facultyPaper.status !== 201 || facultyPaper.body.paper.lifecycleStatus !== 'published')
            throw new Error('Faculty direct publication failed');
        if ((await req(`/papers/${facultyPaper.body.paper._id}/publish`, people.other, 'POST', {})).status !== 403)
            throw new Error('Unauthorized direct publication succeeded');
        const collab = await req('/collaborations', people.pi, 'POST', { title: 'Open team', description: 'Project', subject: 'Physics', openRoles: [{ roleTitle: 'Analyst', vacancies: 1 }] });
        const app = await req(`/collaborations/${collab.body.collaboration._id}/apply`, people.student, 'POST', { roleSought: 'Analyst', statement: 'Interested' });
        const appId = app.body.application?._id;
        if ((await req(`/collaborations/${collab.body.collaboration._id}/applications/${appId}/review`, people.other, 'POST', { status: 'accepted' })).status !== 403)
            throw new Error('Unauthorized collaboration decision succeeded');
        const acceptedCollab = await req(`/collaborations/${collab.body.collaboration._id}/applications/${appId}/review`, people.pi, 'POST', { status: 'accepted' });
        if (acceptedCollab.status !== 200)
            throw new Error(`Authorized collaboration decision failed: ${acceptedCollab.status} ${JSON.stringify(acceptedCollab.body)}`);
        const assignmentHistory = await req(`/assignments?studentId=${people.student._id}`, people.authority);
        if (assignmentHistory.body.assignments.length < 3)
            throw new Error('Assignment history is incomplete');
        console.log('PASS: research workflow, reassignment-ready history, dual approvals, resubmission, direct faculty publication, collaboration authorization');
    }
    finally {
        server.close();
        await Promise.all([ResearchReview_js_1.ResearchReview.deleteMany({}), ResearchPaper_js_1.ResearchPaper.deleteMany({}), ResearchCollaboration_js_1.ResearchCollaboration.deleteMany({}), MentorshipBinding_js_1.MentorshipBinding.deleteMany({}), User_js_1.User.deleteMany({ email: /@research-test\.invalid$/ })]);
        await mongoose_1.default.connection.close();
    }
}
run().catch(err => { console.error(err); process.exitCode = 1; });
