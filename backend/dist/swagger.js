"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerDocument = void 0;
exports.swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'UniSphere / UniGlobe Academic & Professional Platform API',
        version: '1.0.0',
        description: 'REST API documentation for UniSphere — A verified global academic networking, cross-university collaboration, and opportunity discovery platform for students, faculty, and alumni.',
        contact: {
            name: 'RNSIT Hackathon 2026 Developer Team',
        },
    },
    servers: [
        {
            url: 'http://localhost:5000',
            description: 'Local Development Server',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Provide the JWT token received from /api/auth/login or /api/auth/register',
            },
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    name: { type: 'string', example: 'Aryan Sharma' },
                    email: { type: 'string', example: 'aryan.sharma@rnsit.ac.in' },
                    role: { type: 'string', enum: ['student', 'faculty', 'alumni', 'admin'], example: 'student' },
                    institution: { type: 'string', example: 'RNS Institute of Technology' },
                    institutionDomain: { type: 'string', example: 'rnsit.ac.in' },
                    isVerified: { type: 'boolean', example: true },
                    headline: { type: 'string', example: 'Final Year CSE Student | Systems & Full-Stack' },
                    bio: { type: 'string', example: 'Passionate about distributed systems & open source.' },
                    department: { type: 'string', example: 'Computer Science and Engineering' },
                    graduationYear: { type: 'number', example: 2026 },
                    skills: { type: 'array', items: { type: 'string' }, example: ['TypeScript', 'React', 'MongoDB'] },
                    interests: { type: 'array', items: { type: 'string' }, example: ['System Architecture', 'Hackathons'] },
                    avatar: { type: 'string' },
                },
            },
            Post: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    author: { $ref: '#/components/schemas/User' },
                    content: { type: 'string' },
                    category: { type: 'string', enum: ['Research', 'Project', 'Campus Announcement', 'Hackathon', 'Question', 'General'] },
                    tags: { type: 'array', items: { type: 'string' } },
                    likes: { type: 'array', items: { type: 'string' } },
                    comments: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                user: { $ref: '#/components/schemas/User' },
                                text: { type: 'string' },
                                createdAt: { type: 'string', format: 'date-time' },
                            },
                        },
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            Community: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    avatar: { type: 'string' },
                    banner: { type: 'string' },
                    creator: { type: 'string' },
                    members: { type: 'array', items: { type: 'string' } },
                    rules: { type: 'array', items: { type: 'string' } },
                },
            },
            Opportunity: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    title: { type: 'string' },
                    organization: { type: 'string' },
                    type: { type: 'string', enum: ['Internship', 'Research', 'Hackathon', 'Mentorship', 'Full-time', 'Grant'] },
                    location: { type: 'string' },
                    description: { type: 'string' },
                    skillsRequired: { type: 'array', items: { type: 'string' } },
                    applicationLink: { type: 'string' },
                    deadline: { type: 'string', format: 'date-time' },
                    postedBy: { $ref: '#/components/schemas/User' },
                },
            },
        },
    },
    tags: [
        { name: 'Auth', description: 'Authentication, registration, and session token issuance' },
        { name: 'Users', description: 'Profiles, cross-campus directory, portfolio projects & follows' },
        { name: 'Posts', description: 'Campus feeds, academic discussions, likes & comments' },
        { name: 'Communities', description: 'Special interest groups, research labs & club hubs' },
        { name: 'Opportunities', description: 'Internships, research positions, hackathons & mentorships' },
        { name: 'Notifications', description: 'User alerts, activity updates & read status' },
        { name: 'Admin', description: 'Campus governance, user verification & moderation' },
    ],
    paths: {
        '/api/health': {
            get: {
                summary: 'Service Health Check',
                responses: {
                    200: {
                        description: 'System healthy',
                        content: { 'application/json': { schema: { type: 'object' } } },
                    },
                },
            },
        },
        '/api/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Register new student, faculty, or alumni',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'email', 'password', 'institution'],
                                properties: {
                                    name: { type: 'string', example: 'Aryan Sharma' },
                                    email: { type: 'string', example: 'aryan.sharma@rnsit.ac.in' },
                                    password: { type: 'string', example: 'password123' },
                                    role: { type: 'string', enum: ['student', 'faculty', 'alumni'], example: 'student' },
                                    institution: { type: 'string', example: 'RNS Institute of Technology' },
                                    department: { type: 'string', example: 'Computer Science' },
                                    graduationYear: { type: 'number', example: 2026 },
                                    headline: { type: 'string', example: 'Systems and Full Stack Enthusiast' },
                                    bio: { type: 'string', example: 'Student interested in distributed systems' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Registration successful' },
                    400: { description: 'Validation error or email already taken' },
                },
            },
        },
        '/api/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Login with email and password',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', example: 'aryan.sharma@rnsit.ac.in' },
                                    password: { type: 'string', example: 'password123' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Login successful, returns token and user' },
                    401: { description: 'Invalid credentials' },
                },
            },
        },
        '/api/auth/me': {
            get: {
                tags: ['Auth'],
                summary: 'Get currently authenticated user',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Authenticated user profile' },
                    401: { description: 'Unauthorized' },
                },
            },
        },
        '/api/users': {
            get: {
                tags: ['Users'],
                summary: 'Search & discover community members',
                parameters: [
                    { name: 'query', in: 'query', schema: { type: 'string' }, description: 'Search term by name or headline' },
                    { name: 'institution', in: 'query', schema: { type: 'string' }, description: 'Filter by university/college' },
                    { name: 'role', in: 'query', schema: { type: 'string', enum: ['student', 'faculty', 'alumni'] } },
                    { name: 'skill', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    200: { description: 'List of matching members' },
                },
            },
        },
        '/api/users/{id}': {
            get: {
                tags: ['Users'],
                summary: 'Get user profile by ID with portfolio & stats',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'User profile with project details and stats' },
                    404: { description: 'User not found' },
                },
            },
        },
        '/api/users/profile/me': {
            put: {
                tags: ['Users'],
                summary: 'Update own profile',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object' } } },
                },
                responses: {
                    200: { description: 'Profile updated' },
                },
            },
        },
        '/api/users/projects': {
            post: {
                tags: ['Users'],
                summary: 'Add project to portfolio showcase',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['title', 'description'],
                                properties: {
                                    title: { type: 'string', example: 'Distributed Graph Engine' },
                                    description: { type: 'string', example: 'Scalable graph computing in Go' },
                                    link: { type: 'string', example: 'https://github.com/user/graph' },
                                    tags: { type: 'array', items: { type: 'string' } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Project added' },
                },
            },
        },
        '/api/users/{id}/follow': {
            post: {
                tags: ['Users'],
                summary: 'Follow or unfollow user',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Follow status toggled' },
                },
            },
        },
        '/api/posts': {
            get: {
                tags: ['Posts'],
                summary: 'Get global feed posts with pagination and filters',
                parameters: [
                    { name: 'category', in: 'query', schema: { type: 'string' } },
                    { name: 'tag', in: 'query', schema: { type: 'string' } },
                    { name: 'communityId', in: 'query', schema: { type: 'string' } },
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                ],
                responses: {
                    200: { description: 'Paginated posts' },
                },
            },
            post: {
                tags: ['Posts'],
                summary: 'Publish a new post or announcement',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['content'],
                                properties: {
                                    content: { type: 'string' },
                                    category: { type: 'string', enum: ['Research', 'Project', 'Campus Announcement', 'Hackathon', 'Question', 'General'] },
                                    communityId: { type: 'string' },
                                    tags: { type: 'array', items: { type: 'string' } },
                                    attachments: { type: 'array', items: { type: 'string' } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Post created' },
                },
            },
        },
        '/api/posts/{id}': {
            get: {
                tags: ['Posts'],
                summary: 'Get post by ID with comments',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Post details' },
                },
            },
            delete: {
                tags: ['Posts'],
                summary: 'Delete post',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Post deleted' },
                },
            },
        },
        '/api/posts/{id}/like': {
            post: {
                tags: ['Posts'],
                summary: 'Like or unlike post',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Like toggled' },
                },
            },
        },
        '/api/posts/{id}/comment': {
            post: {
                tags: ['Posts'],
                summary: 'Comment on a post',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['text'],
                                properties: { text: { type: 'string' } },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Comment added' },
                },
            },
        },
        '/api/communities': {
            get: {
                tags: ['Communities'],
                summary: 'List campus communities and interest hubs',
                parameters: [
                    { name: 'category', in: 'query', schema: { type: 'string' } },
                    { name: 'search', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    200: { description: 'List of communities' },
                },
            },
            post: {
                tags: ['Communities'],
                summary: 'Create a new community group',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'description'],
                                properties: {
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    category: { type: 'string' },
                                    rules: { type: 'array', items: { type: 'string' } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Community created' },
                },
            },
        },
        '/api/communities/{idOrSlug}': {
            get: {
                tags: ['Communities'],
                summary: 'Get community by ID or slug',
                parameters: [{ name: 'idOrSlug', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Community details' },
                },
            },
        },
        '/api/communities/{id}/join': {
            post: {
                tags: ['Communities'],
                summary: 'Join community',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Joined successfully' },
                },
            },
        },
        '/api/communities/{id}/leave': {
            post: {
                tags: ['Communities'],
                summary: 'Leave community',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Left successfully' },
                },
            },
        },
        '/api/opportunities': {
            get: {
                tags: ['Opportunities'],
                summary: 'Browse internships, research, grants & hackathons',
                parameters: [
                    { name: 'type', in: 'query', schema: { type: 'string' } },
                    { name: 'search', in: 'query', schema: { type: 'string' } },
                    { name: 'location', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    200: { description: 'List of opportunities' },
                },
            },
            post: {
                tags: ['Opportunities'],
                summary: 'Post opportunity (Internship, Research, Hackathon, Mentorship)',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['title', 'organization', 'type', 'description'],
                                properties: {
                                    title: { type: 'string' },
                                    organization: { type: 'string' },
                                    type: { type: 'string', enum: ['Internship', 'Research', 'Hackathon', 'Mentorship', 'Full-time', 'Grant'] },
                                    location: { type: 'string' },
                                    description: { type: 'string' },
                                    skillsRequired: { type: 'array', items: { type: 'string' } },
                                    applicationLink: { type: 'string' },
                                    deadline: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Opportunity posted' },
                },
            },
        },
        '/api/opportunities/{id}': {
            get: {
                tags: ['Opportunities'],
                summary: 'Get opportunity details by ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Opportunity details' },
                },
            },
        },
        '/api/opportunities/{id}/apply': {
            post: {
                tags: ['Opportunities'],
                summary: 'Apply or express interest in opportunity',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Application recorded' },
                },
            },
        },
        '/api/notifications': {
            get: {
                tags: ['Notifications'],
                summary: 'Get alerts and notifications for authenticated user',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Notifications and unread count' },
                },
            },
        },
        '/api/notifications/read-all': {
            put: {
                tags: ['Notifications'],
                summary: 'Mark all notifications as read',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Notifications marked read' },
                },
            },
        },
        '/api/admin/stats': {
            get: {
                tags: ['Admin'],
                summary: 'Administrative metrics & role analytics',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Platform stats and counts' },
                },
            },
        },
        '/api/admin/reports': {
            post: {
                tags: ['Admin'],
                summary: 'Report post, comment, or user for moderation',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['targetType', 'targetId', 'reason'],
                                properties: {
                                    targetType: { type: 'string', enum: ['post', 'user', 'comment'] },
                                    targetId: { type: 'string' },
                                    reason: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Report logged for review' },
                },
            },
            get: {
                tags: ['Admin'],
                summary: 'List flagged content reports (admin only)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Pending reports' },
                },
            },
        },
    },
};
