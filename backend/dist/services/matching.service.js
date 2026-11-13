"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingService = void 0;
const User_js_1 = require("../models/User.js");
const ResearchCollaboration_js_1 = require("../models/ResearchCollaboration.js");
const ResearchPaper_js_1 = require("../models/ResearchPaper.js");
class MatchingService {
    /**
     * Matches open research collaborations against a user's skills, interests, and profile.
     */
    static async matchCollaborationsForUser(userId, limit = 10) {
        const user = await User_js_1.User.findById(userId);
        if (!user)
            return [];
        const userSkills = (user.skills || []).map((s) => s.toLowerCase().trim());
        const userInterests = (user.interests || []).map((i) => i.toLowerCase().trim());
        const userDept = (user.department || '').toLowerCase().trim();
        const userInst = (user.institution || '').toLowerCase().trim();
        // Find open collaborations (exclude projects already led by this user)
        const collaborations = await ResearchCollaboration_js_1.ResearchCollaboration.find({
            status: 'open',
            leadResearcher: { $ne: user._id }
        })
            .populate('leadResearcher', 'name avatar institution role headline isVerified')
            .populate('supervisor', 'name avatar institution role headline isVerified')
            .populate('teamMembers.user', 'name avatar institution role');
        const scoredProjects = collaborations.map((collab) => {
            const requiredSkills = (collab.requiredSkills || []).map((s) => s.toLowerCase().trim());
            const tags = (collab.tags || []).map((t) => t.toLowerCase().trim());
            const subject = (collab.subject || '').toLowerCase().trim();
            const collabDept = (collab.department || '').toLowerCase().trim();
            const collabInst = (collab.institution || '').toLowerCase().trim();
            // Skill Overlap
            const matchingSkills = [];
            requiredSkills.forEach((rs) => {
                if (userSkills.some((us) => us === rs || us.includes(rs) || rs.includes(us))) {
                    matchingSkills.push(rs);
                }
            });
            // Interest & Topic Overlap
            const matchingInterests = [];
            userInterests.forEach((ui) => {
                if (tags.some((t) => t === ui || t.includes(ui) || ui.includes(t)) ||
                    subject.includes(ui) ||
                    ui.includes(subject)) {
                    matchingInterests.push(ui);
                }
            });
            const departmentMatch = !!userDept && !!collabDept && (userDept === collabDept || userDept.includes(collabDept) || collabDept.includes(userDept));
            const institutionMatch = !!userInst && !!collabInst && userInst === collabInst;
            // Scoring Weight Calculation:
            // Skills: 50%
            // Interests: 30%
            // Department: 10%
            // Institution Affinity: 10%
            let skillScore = 0;
            if (requiredSkills.length > 0) {
                skillScore = Math.min(1, matchingSkills.length / Math.max(1, requiredSkills.length)) * 50;
            }
            else {
                skillScore = matchingSkills.length > 0 ? 35 : 20; // Default baseline if project has open requirements
            }
            let interestScore = 0;
            if (tags.length > 0 || subject) {
                interestScore = Math.min(1, (matchingInterests.length + (matchingSkills.length > 0 ? 0.5 : 0)) / 2) * 30;
            }
            const deptScore = departmentMatch ? 10 : 0;
            const instScore = institutionMatch ? 10 : 5; // Cross-college gets a 5pt diversity score
            const totalScore = Math.round(Math.min(100, Math.max(15, skillScore + interestScore + deptScore + instScore)));
            // Transparent, rule-based reasons explaining why this project matches
            const matchReasons = [];
            if (matchingSkills.length > 0) {
                matchReasons.push(`Matches ${matchingSkills.length} required skill${matchingSkills.length > 1 ? 's' : ''}: ${matchingSkills.join(', ')}`);
            }
            if (matchingInterests.length > 0) {
                matchReasons.push(`Shared research topic: ${matchingInterests.join(', ')}`);
            }
            if (departmentMatch) {
                matchReasons.push(`Department alignment (${collab.department})`);
            }
            if (institutionMatch) {
                matchReasons.push(`Campus match (${collab.institution})`);
            }
            const explanation = matchReasons.length > 0
                ? matchReasons.join(' • ')
                : `Interdisciplinary research call in ${collab.subject}`;
            return {
                collaboration: collab,
                matchScore: totalScore,
                matchingSkills,
                matchingInterests,
                departmentMatch,
                institutionMatch,
                explanation,
                matchReasons
            };
        });
        // Sort by match score descending
        scoredProjects.sort((a, b) => b.matchScore - a.matchScore);
        return scoredProjects.slice(0, limit);
    }
    /**
     * Matches compatible researchers, advisors, and peer collaborators across institutions.
     */
    static async matchScholarsForUser(userId, limit = 10) {
        const user = await User_js_1.User.findById(userId);
        if (!user)
            return [];
        const userSkills = (user.skills || []).map((s) => s.toLowerCase().trim());
        const userInterests = (user.interests || []).map((i) => i.toLowerCase().trim());
        const userDept = (user.department || '').toLowerCase().trim();
        const userInst = (user.institution || '').toLowerCase().trim();
        // Query other users
        const candidates = await User_js_1.User.find({ _id: { $ne: user._id } })
            .select('name email avatar institution department role headline bio skills interests isVerified')
            .limit(60);
        // Get papers count map for candidates
        const candidateIds = candidates.map((c) => c._id);
        const papers = await ResearchPaper_js_1.ResearchPaper.find({ submittedBy: { $in: candidateIds } }).select('submittedBy');
        const paperCountMap = new Map();
        papers.forEach((p) => {
            const sId = p.submittedBy.toString();
            paperCountMap.set(sId, (paperCountMap.get(sId) || 0) + 1);
        });
        const scoredScholars = candidates.map((c) => {
            const cSkills = (c.skills || []).map((s) => s.toLowerCase().trim());
            const cInterests = (c.interests || []).map((i) => i.toLowerCase().trim());
            const cDept = (c.department || '').toLowerCase().trim();
            const cInst = (c.institution || '').toLowerCase().trim();
            // Shared Skills
            const sharedSkills = [];
            userSkills.forEach((us) => {
                if (cSkills.some((cs) => cs === us || cs.includes(us) || us.includes(cs))) {
                    sharedSkills.push(us);
                }
            });
            // Shared Interests
            const sharedInterests = [];
            userInterests.forEach((ui) => {
                if (cInterests.some((ci) => ci === ui || ci.includes(ui) || ui.includes(ci))) {
                    sharedInterests.push(ui);
                }
            });
            const commonDepartment = !!userDept && !!cDept && (userDept === cDept || userDept.includes(cDept) || cDept.includes(userDept));
            const commonInstitution = !!userInst && !!cInst && userInst === cInst;
            const pubCount = paperCountMap.get(c._id.toString()) || 0;
            // Scoring:
            // Shared skills: 40%
            // Shared interests: 35%
            // Department alignment: 15%
            // Publication presence: 10%
            const skillScore = Math.min(1, sharedSkills.length / Math.max(1, Math.min(userSkills.length, 4))) * 40;
            const interestScore = Math.min(1, sharedInterests.length / Math.max(1, Math.min(userInterests.length, 3))) * 35;
            const deptScore = commonDepartment ? 15 : 5;
            const pubScore = pubCount > 0 ? Math.min(10, pubCount * 3) : 0;
            const totalScore = Math.round(Math.min(100, Math.max(25, skillScore + interestScore + deptScore + pubScore)));
            return {
                scholar: {
                    _id: c._id.toString(),
                    name: c.name,
                    email: c.email,
                    avatar: c.avatar,
                    institution: c.institution,
                    department: c.department,
                    role: c.role,
                    headline: c.headline,
                    bio: c.bio,
                    skills: c.skills || [],
                    interests: c.interests || []
                },
                compatibilityScore: totalScore,
                sharedSkills,
                sharedInterests,
                commonDepartment,
                commonInstitution,
                publicationCount: pubCount
            };
        });
        scoredScholars.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
        return scoredScholars.slice(0, limit);
    }
}
exports.MatchingService = MatchingService;
