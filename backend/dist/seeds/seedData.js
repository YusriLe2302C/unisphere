"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_js_1 = require("../config/db.js");
const User_js_1 = require("../models/User.js");
const Post_js_1 = require("../models/Post.js");
const Community_js_1 = require("../models/Community.js");
const Opportunity_js_1 = require("../models/Opportunity.js");
const Notification_js_1 = require("../models/Notification.js");
const seedDatabase = async () => {
    try {
        await (0, db_js_1.connectDB)();
        console.log('[Seeder] Connected to database. Clearing existing collections...');
        await Promise.all([
            User_js_1.User.deleteMany({}),
            Post_js_1.Post.deleteMany({}),
            Community_js_1.Community.deleteMany({}),
            Opportunity_js_1.Opportunity.deleteMany({}),
            Notification_js_1.Notification.deleteMany({})
        ]);
        console.log('[Seeder] Creating realistic demo users across institutions...');
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash('password123', salt);
        // 1. Users
        const users = await User_js_1.User.create([
            {
                name: 'Aryan Sharma',
                email: 'aryan.sharma@rnsit.ac.in',
                password: passwordHash,
                role: 'student',
                institution: 'RNS Institute of Technology',
                institutionDomain: 'rnsit.ac.in',
                isVerified: true,
                avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
                headline: 'Final Year CSE Student | Systems & Full-Stack Enthusiast',
                bio: 'Passionate about distributed systems, React, and building cross-college open-source tools. Looking for research collaborators in distributed databases.',
                department: 'Computer Science and Engineering',
                graduationYear: 2026,
                skills: ['TypeScript', 'React', 'Node.js', 'Distributed Systems', 'MongoDB', 'Docker'],
                interests: ['System Architecture', 'Hackathons', 'Open Source', 'Web3'],
                projects: [
                    {
                        title: 'UniGlobe Network',
                        description: 'A global unified collaboration and research platform connecting students and faculty worldwide.',
                        link: 'https://github.com/aryan/uniglobe',
                        tags: ['React', 'TypeScript', 'Node.js']
                    },
                    {
                        title: 'HyperCluster P2P',
                        description: 'Peer-to-peer file transfer engine with SHA-256 chunk verification.',
                        link: 'https://github.com/aryan/hypercluster',
                        tags: ['Go', 'Networking']
                    }
                ],
                achievements: [
                    {
                        title: '1st Place - Smart India Hackathon 2025',
                        issuer: 'Ministry of Education',
                        year: 2025,
                        description: 'Developed an automated rural tele-medicine triage system.'
                    }
                ]
            },
            {
                name: 'Dr. Sarah Chen',
                email: 'schen@mit.edu',
                password: passwordHash,
                role: 'faculty',
                institution: 'MIT',
                institutionDomain: 'mit.edu',
                isVerified: true,
                avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                headline: 'Associate Professor of Computer Science | AI & Robot Perception Lab',
                bio: 'Principal Investigator researching multimodality, computer vision, and foundation models for embodied robotics. Open to mentoring promising undergraduates globally.',
                department: 'EECS & CSAIL',
                graduationYear: 2012,
                skills: ['Machine Learning', 'Computer Vision', 'PyTorch', 'Robotics', 'Academic Writing'],
                interests: ['Embodied AI', 'Neuromorphic Computing', 'Cross-College Research'],
                projects: [
                    {
                        title: 'PerceptNet-V3',
                        description: 'Lightweight perception model for micro-aerial quadrotors.',
                        link: 'https://csail.mit.edu/research/perceptnet',
                        tags: ['PyTorch', 'Robotics']
                    }
                ],
                achievements: [
                    {
                        title: 'NSF CAREER Award in Artificial Intelligence',
                        issuer: 'National Science Foundation',
                        year: 2023,
                        description: 'Recognized for pioneering contributions in autonomous robot manipulation.'
                    }
                ]
            },
            {
                name: 'David Miller',
                email: 'david.miller@alumni.berkeley.edu',
                password: passwordHash,
                role: 'alumni',
                institution: 'UC Berkeley',
                institutionDomain: 'berkeley.edu',
                isVerified: true,
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
                headline: 'Staff Software Engineer @ Google Cloud | Ex-Meta',
                bio: 'UC Berkeley EECS Class of 2019. Now building distributed storage systems at Google Cloud. Happy to offer career guidance, resume reviews, and mentorship to students from any university!',
                department: 'Electrical Engineering & Computer Sciences',
                graduationYear: 2019,
                skills: ['Distributed Systems', 'C++', 'Go', 'Kubernetes', 'Cloud Infrastructure', 'System Design'],
                interests: ['Mentorship', 'Cloud Computing', 'Database Internals'],
                projects: [
                    {
                        title: 'RaftKV Consensus Engine',
                        description: 'Educational implementation of the Raft consensus algorithm with fault-tolerant KV store.',
                        link: 'https://github.com/davidm/raft-kv',
                        tags: ['Go', 'Distributed Systems']
                    }
                ],
                achievements: [
                    {
                        title: 'Outstanding Graduate Student Instructor Award',
                        issuer: 'UC Berkeley',
                        year: 2019,
                        description: 'Awarded for teaching CS162 Operating Systems.'
                    }
                ]
            },
            {
                name: 'Dr. Ananya Rao',
                email: 'dean.academic@rnsit.ac.in',
                password: passwordHash,
                role: 'admin',
                institution: 'RNS Institute of Technology',
                institutionDomain: 'rnsit.ac.in',
                isVerified: true,
                avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
                headline: 'Dean of Academic Partnerships & Global Research Collaboration',
                bio: 'Overseeing global academic collaborations, student exchange initiatives, institutional verification, and research incubation hubs.',
                department: 'Academic Administration',
                skills: ['Academic Administration', 'Policy', 'Research Ethics', 'Accreditation'],
                interests: ['Higher Education Reform', 'Industry-Academia Linkage', 'Interdisciplinary Studies'],
                projects: [],
                achievements: []
            },
            {
                name: 'Maya Lin',
                email: 'mayalin@stanford.edu',
                password: passwordHash,
                role: 'student',
                institution: 'Stanford University',
                institutionDomain: 'stanford.edu',
                isVerified: true,
                avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
                headline: 'MS Artificial Intelligence Student | Natural Language Processing Researcher',
                bio: 'Working on LLM reasoning and mechanistic interpretability. Seeking teammates for global research benchmark challenges and hackathons.',
                department: 'Stanford AI Lab (SAIL)',
                graduationYear: 2026,
                skills: ['Python', 'Transformers', 'NLP', 'PyTorch', 'Data Science'],
                interests: ['Interpretability', 'Knowledge Graphs', 'AI Alignment'],
                projects: [
                    {
                        title: 'LatentLens',
                        description: 'Tool for visual analysis of hidden activations in open weights LLMs.',
                        tags: ['Python', 'Streamlit']
                    }
                ],
                achievements: [
                    {
                        title: 'NeurIPS 2025 Student Workshop Oral Presentation',
                        issuer: 'NeurIPS',
                        year: 2025
                    }
                ]
            }
        ]);
        const [aryan, drSarah, david, adminUser, maya] = users;
        // Follow relationships
        aryan.following.push(drSarah._id, david._id, maya._id);
        aryan.followers.push(maya._id, david._id);
        await aryan.save();
        maya.following.push(aryan._id, drSarah._id);
        maya.followers.push(aryan._id);
        await maya.save();
        drSarah.followers.push(aryan._id, maya._id);
        await drSarah.save();
        david.following.push(aryan._id);
        david.followers.push(aryan._id);
        await david.save();
        console.log('[Seeder] Creating Communities...');
        // 2. Communities
        const communities = await Community_js_1.Community.create([
            {
                name: 'AI & Machine Learning Innovation Hub',
                slug: 'ai-ml-hub',
                description: 'A global collaborative forum for researchers, students, and practitioners exploring LLMs, computer vision, reinforcement learning, and ethical AI across universities.',
                category: 'Artificial Intelligence',
                banner: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop&q=80',
                avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                creator: drSarah._id,
                members: [drSarah._id, aryan._id, maya._id],
                moderators: [drSarah._id],
                rules: [
                    'Cite academic sources and papers when sharing benchmarks.',
                    'Respect researchers from all universities and experience levels.',
                    'Share open-weights models and reproducible code whenever possible.'
                ]
            },
            {
                name: 'Distributed Systems & Cloud Architecture',
                slug: 'distributed-systems',
                description: 'Deep dives into consensus protocols, Raft/Paxos, database internals, low-latency networking, and cloud-native infrastructure.',
                category: 'Systems & Infrastructure',
                banner: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
                avatar: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&auto=format&fit=crop&q=80',
                creator: david._id,
                members: [david._id, aryan._id],
                moderators: [david._id],
                rules: [
                    'Code snippets and architecture diagrams are strongly encouraged.',
                    'Keep discussions focused on engineering trade-offs and performance.'
                ]
            },
            {
                name: 'Cross-College Hackathon Builders',
                slug: 'hackathon-builders',
                description: 'Find multidisciplinary teammates across universities for international hackathons, grants, and fast prototype building.',
                category: 'Hackathons & Startups',
                banner: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80',
                avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
                creator: aryan._id,
                members: [aryan._id, maya._id, david._id],
                moderators: [aryan._id],
                rules: [
                    'Post team openings with clear role descriptions and tech stacks.',
                    'Credit all student contributors fairly.'
                ]
            },
            {
                name: 'Robotics, IoT & Embedded Systems',
                slug: 'robotics-iot',
                description: 'Hardware hackers, ROS developers, autonomous vehicle researchers, and firmware engineers uniting across global institutions.',
                category: 'Robotics & Hardware',
                banner: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
                avatar: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80',
                creator: drSarah._id,
                members: [drSarah._id, aryan._id],
                moderators: [drSarah._id],
                rules: ['Safety first when posting high-voltage or drone testing videos.']
            }
        ]);
        const [aiHub, systemsHub, hackHub] = communities;
        console.log('[Seeder] Creating Global Feed Posts...');
        // 3. Posts
        await Post_js_1.Post.create([
            {
                author: drSarah._id,
                content: `Excited to announce our lab at MIT is looking for 2 undergraduate research collaborators for our upcoming paper on 'Low-Latency Vision-Language Action Models for Drones'. 

Students from ANY accredited college are welcome to apply. We care about curiosity, strong PyTorch skills, and commitment to open research! 🚀

Feel free to comment with your background or DM me directly.`,
                category: 'Research',
                tags: ['Research', 'Robotics', 'MIT', 'Collaboration'],
                community: aiHub._id,
                mediaUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
                likes: [aryan._id, maya._id, david._id],
                comments: [
                    {
                        user: aryan._id,
                        content: 'This sounds fascinating Prof. Sarah! I have hands-on experience with TensorRT optimizations on Jetson Orin. Would love to contribute.',
                        createdAt: new Date(Date.now() - 3600000 * 2)
                    },
                    {
                        user: maya._id,
                        content: 'Incredible initiative to open this across institutions! Shared this with our Stanford robotics group.',
                        createdAt: new Date(Date.now() - 3600000 * 1)
                    }
                ]
            },
            {
                author: aryan._id,
                content: `Proud to showcase our team's project: 'UniGlobe Network' 🌍

We wanted to solve a real dilemma: college portals keep students isolated inside institutional silos. A student at RNSIT should easily collaborate with a researcher at MIT or seek mentorship from an alumnus at UC Berkeley.

College affiliation provides verified trust and credibility — not a digital border. Check out our architecture and let me know your thoughts!`,
                category: 'Project',
                tags: ['FullStack', 'WebDev', 'MERN', 'Hackathon'],
                community: hackHub._id,
                mediaUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
                likes: [drSarah._id, maya._id, david._id, adminUser._id],
                comments: [
                    {
                        user: david._id,
                        content: 'Spot on Aryan. When I was at Berkeley, some of our most impactful open-source tools came from cross-institution collaborations. Great work!',
                        createdAt: new Date(Date.now() - 3600000 * 4)
                    }
                ]
            },
            {
                author: david._id,
                content: `Quick announcement for senior students preparing for tech interviews:

I will be hosting 3 mock System Design and Architecture mentorship sessions this weekend for any students transitioning into distributed systems engineering. No fees, just bring your curiosity and your questions!

Drop a comment below with the topic you struggle with most (e.g. Sharding, Consistent Hashing, Consensus).`,
                category: 'Opportunity',
                tags: ['Mentorship', 'Career', 'DistributedSystems', 'Alumni'],
                community: systemsHub._id,
                likes: [aryan._id, maya._id],
                comments: [
                    {
                        user: aryan._id,
                        content: 'Consistent Hashing and handling hot partitions in cache clusters would be amazing to review!',
                        createdAt: new Date(Date.now() - 3600000 * 5)
                    }
                ]
            },
            {
                author: maya._id,
                content: `Thrilled to share that our joint benchmark paper on 'Measuring Hallucination Drift in Multi-Turn Agent Conversations' was accepted at NAACL 2026! 

Huge thanks to our cross-college co-authors from CMU and Stanford. When researchers bridge campus boundaries, science moves faster. 📚✨`,
                category: 'Achievement',
                tags: ['NLP', 'NAACL2026', 'Research', 'Achievement'],
                community: aiHub._id,
                mediaUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
                likes: [drSarah._id, aryan._id],
                comments: []
            }
        ]);
        console.log('[Seeder] Creating Opportunities...');
        // 4. Opportunities
        await Opportunity_js_1.Opportunity.create([
            {
                title: 'Graduate & Undergraduate Research Fellow (Summer 2026)',
                organization: 'MIT CSAIL Robotics Perception Lab',
                institution: 'MIT',
                type: 'Research Assistantship',
                location: 'Cambridge, MA / Hybrid',
                description: 'Funded 10-week summer research position working on autonomous vision systems for micro-UAVs. Open to qualified students from all accredited universities.',
                requirements: ['Proficiency in Python and PyTorch', 'Linear algebra & calculus fundamentals', 'Prior coursework in Computer Vision or Robotics'],
                deadline: 'April 30, 2026',
                applyUrl: 'https://csail.mit.edu/fellowships',
                postedBy: drSarah._id
            },
            {
                title: 'Distributed Cloud Infrastructure Intern',
                organization: 'Google Cloud Platform',
                institution: 'Industry Partner',
                type: 'Internship',
                location: 'Sunnyvale, CA / Remote Available',
                description: 'Work alongside world-class systems engineers building large-scale distributed storage and container scheduling platforms.',
                requirements: ['Pursuing BS or MS in Computer Science', 'Strong coding skills in Go, C++, or Java', 'Knowledge of Data Structures and OS concepts'],
                deadline: 'May 15, 2026',
                applyUrl: 'https://careers.google.com/jobs',
                postedBy: david._id
            },
            {
                title: 'Global Inter-University Hackathon 2026',
                organization: 'IEEE Student Chapter & UniGlobe',
                institution: 'RNSIT & Global Partners',
                type: 'Hackathon',
                location: 'Virtual / Global',
                description: '$15,000 in prizes across AI for Good, Climate Tech, and Decentralized Systems. Teams must consist of students from at least two different institutions.',
                requirements: ['Active student ID from any recognized college', 'Teams of 2 to 4 members', 'Open-source project submission'],
                deadline: 'June 10, 2026',
                applyUrl: 'https://uniglobe.org/hackathon-2026',
                postedBy: aryan._id
            },
            {
                title: 'Alumni 1-on-1 Career Mentorship Program',
                organization: 'Silicon Valley Alumni Network',
                institution: 'UC Berkeley',
                type: 'Mentorship',
                location: 'Remote (Zoom)',
                description: 'Bi-weekly 45-minute mentorship pairing senior software engineers and engineering managers with students seeking resume feedback and career guidance.',
                requirements: ['Enrolled university student or recent graduate', 'Prepared questions and updated LinkedIn/resume'],
                deadline: 'Rolling Basis',
                applyUrl: 'https://mentorship.berkeley-alumni.org',
                postedBy: david._id
            }
        ]);
        console.log('[Seeder] Creating Notifications...');
        // 5. Notifications
        await Notification_js_1.Notification.create([
            {
                recipient: aryan._id,
                sender: drSarah._id,
                type: 'like',
                message: 'Prof. Sarah Chen (MIT) liked your project "UniGlobe Network".'
            },
            {
                recipient: aryan._id,
                sender: david._id,
                type: 'comment',
                message: 'David Miller (UC Berkeley) commented on your project post.'
            },
            {
                recipient: aryan._id,
                sender: maya._id,
                type: 'follow',
                message: 'Maya Lin (Stanford University) started following you.'
            }
        ]);
        console.log('==================================================');
        console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
        console.log('Demo Accounts for 1-Click Login:');
        console.log('1. Student:  aryan.sharma@rnsit.ac.in      (pw: password123)');
        console.log('2. Faculty:  schen@mit.edu                 (pw: password123)');
        console.log('3. Alumni:   david.miller@alumni.berkeley.edu (pw: password123)');
        console.log('4. Admin:    dean.academic@rnsit.ac.in     (pw: password123)');
        console.log('==================================================');
        process.exit(0);
    }
    catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};
seedDatabase();
