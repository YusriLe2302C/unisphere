export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'UniSphere / UniGlobe Academic & Professional Platform API',
    version: '1.0.0',
    description:
      'REST API documentation for UniSphere — A verified global academic networking, cross-university collaboration, and opportunity discovery platform for students, faculty, and alumni.',
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
          role: { type: 'string', enum: ['student', 'faculty', 'alumni', 'dean', 'principal', 'admin'], example: 'student' },
          responsibilities: { type: 'array', items: { type: 'string', enum: ['proctor', 'project_guide', 'rnd_staff', 'placement_coordinator', 'club_advisor'] } },
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
    { name: 'Messages', description: 'Persistent private and group messaging, history and receipts' },
  ],
  paths: {
    '/api/files': { post: { tags: ['Files'], summary: 'Upload a validated file and create private metadata', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, associatedEntityType: { type: 'string' }, associatedEntityId: { type: 'string' }, accessPolicy: { type: 'string', enum: ['private','restricted','institutional','public'] } }, required: ['file','associatedEntityType'] } } } }, responses: { 201: { description: 'Stored file metadata' }, 415: { description: 'Invalid file signature' } } } },
    '/api/files/{id}': { get: { tags: ['Files'], summary: 'Download or preview an authorized file', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'File bytes' }, 403: { description: 'Access denied' } } }, delete: { tags: ['Files'], summary: 'Delete an authorized file', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } } },
    '/api/files/{id}/replace': { put: { tags: ['Files'], summary: 'Replace file content while retaining metadata identity', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Replaced' } } } },
    '/api/files/maintenance/orphans': { post: { tags: ['Files'], summary: 'Report or clean orphaned storage objects', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Orphan scan result' } } } },
    '/api/timetable/revisions': { post: { tags: ['Timetable'], summary: 'Stage a conflict-checked department timetable revision', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Revision staged' }, 409: { description: 'Scheduling conflict' } } } },
    '/api/timetable/revisions/{changeSetId}/publish': { post: { tags: ['Timetable'], summary: 'Publish a staged timetable revision', security: [{ bearerAuth: [] }], parameters: [{ name: 'changeSetId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Revision published' }, 409: { description: 'Scheduling conflict' } } } },
    '/api/timetable/department/{department}': { get: { tags: ['Timetable'], summary: 'Retrieve published timetable by department with filters', security: [{ bearerAuth: [] }], parameters: [{ name: 'department', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Published timetable' } } } },
    '/api/timetable/me': { get: { tags: ['Timetable'], summary: 'Retrieve the signed-in student or faculty timetable', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Personal timetable' } } } },
    '/api/messages/conversations': { get: { tags: ['Messages'], summary: 'List conversations for the signed-in user', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Conversation list' } } } },
    '/api/messages/conversations/direct': { post: { tags: ['Messages'], summary: 'Create or retrieve an authorized direct conversation', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Conversation' }, 403: { description: 'Direct messages are unavailable' } } } },
    '/api/messages/conversations/group': { post: { tags: ['Messages'], summary: 'Create a same-institution group conversation', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Conversation created' } } } },
    '/api/messages/conversations/{id}/messages': { get: { tags: ['Messages'], summary: 'Retrieve paginated persistent message history', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Message history' } } }, post: { tags: ['Messages'], summary: 'Persist and send a message', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Message saved' } } } },
    '/api/notifications/preferences': { get: { tags: ['Notifications'], summary: 'Get notification preferences', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Notification preferences' } } }, put: { tags: ['Notifications'], summary: 'Update notification preferences', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Preferences updated' } } } },
    '/api/admin/audit': { get: { tags: ['Admin'], summary: 'View immutable, tamper-evident audit entries', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Audit entries' } } } },
    '/api/admin/audit/verify': { get: { tags: ['Admin'], summary: 'Verify the audit chain and HMAC digests', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Chain verification result' } } } },
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
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout — revokes current JWT via tokenVersion increment',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Logged out, token revoked' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/verify-email/{token}': {
      get: {
        tags: ['Auth'],
        summary: 'Verify email address via token link',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Email verified' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } },
            },
          },
        },
        responses: {
          200: { description: 'Reset link sent (or silently ignored if email not found)' },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using token from email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset successfully' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/api/auth/create-authority': {
      post: {
        tags: ['Auth'],
        summary: 'Admin: create authority account (dean, principal, admin, faculty, etc.)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'institution', 'role'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  institution: { type: 'string' },
                  role: { type: 'string', enum: ['student', 'faculty', 'alumni', 'dean', 'principal', 'admin'] },
                  responsibilities: { type: 'array', items: { type: 'string', enum: ['proctor', 'project_guide', 'rnd_staff', 'placement_coordinator', 'club_advisor'] } },
                  department: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Authority account created' },
          400: { description: 'Validation error or duplicate email' },
          403: { description: 'Insufficient privileges' },
        },
      },
    },
    '/api/auth/users/{userId}/role': {
      put: {
        tags: ['Auth'],
        summary: 'Admin: assign primary role to existing user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['student', 'faculty', 'alumni', 'dean', 'principal', 'admin'] },
                  responsibilities: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Role assigned' },
          403: { description: 'Privilege escalation blocked' },
        },
      },
    },
    '/api/auth/users/{userId}/responsibilities': {
      put: {
        tags: ['Auth'],
        summary: 'Admin/Dean/Principal: assign scoped responsibilities without creating new account',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['responsibilities'],
                properties: {
                  responsibilities: { type: 'array', items: { type: 'string', enum: ['proctor', 'project_guide', 'rnd_staff', 'placement_coordinator', 'club_advisor'] } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Responsibilities updated' },
          403: { description: 'Insufficient authority' },
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
    '/api/users/{id}/status': {
      put: {
        tags: ['Users'],
        summary: 'Admin/Dean/Principal: suspend or reactivate user account',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isActive: { type: 'boolean' },
                  disciplinaryStatus: { type: 'string', enum: ['good_standing', 'warning', 'probation', 'suspended'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Account status updated' },
          403: { description: 'Cross-institution access blocked or insufficient role' },
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
    '/api/research/papers/mine': { get: { tags: ['Research'], summary: 'List papers you submitted or review', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Research papers' } } } },
    '/api/research/assignments': {
      get: { tags: ['Research'], summary: 'List scoped research assignment history', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Assignments' } } },
      post: { tags: ['Research'], summary: 'Assign Proctor or Project Guide', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['studentId','facultyId','assignmentType'], properties: { studentId: { type: 'string' }, facultyId: { type: 'string' }, assignmentType: { type: 'string', enum: ['proctor','project_guide'] }, collaborationId: { type: 'string' } } } } }, responses: { 201: { description: 'Assignment created' }, 403: { description: 'Insufficient authority' } } } }
    },
    '/api/research/assignments/{id}/reassign': { post: { tags: ['Research'], summary: 'Reassign research reviewer and retain history', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Assignment transferred' } } } },
    '/api/research/papers/{id}/reviews': {
      get: { tags: ['Research'], summary: 'Get authorized review history', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Review history' } } },
      post: { tags: ['Research'], summary: 'Submit assigned Proctor or Project Guide review', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['verdict','comments'], properties: { verdict: { type: 'string', enum: ['approved','changes_requested','rejected'] }, comments: { type: 'string' } } } } }, responses: { 201: { description: 'Review saved' }, 403: { description: 'Not assigned reviewer' }, 409: { description: 'Duplicate or invalid review stage' } } } }
    },
    '/api/research/papers/{id}/resubmit': { post: { tags: ['Research'], summary: 'Resubmit rejected student research for a new review cycle', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Resubmitted' } } } },
    '/api/research/papers/{id}/publish': { post: { tags: ['Research'], summary: 'Publish approved student paper or faculty authored research', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Published' }, 409: { description: 'Required approvals missing' } } } },
    '/api/career/alumni': { get: { tags: ['Career Connect'], summary: 'Search institution alumni by company, industry, designation, or skill', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Matching alumni' } } } },
    '/api/career/alumni/profile': { put: { tags: ['Career Connect'], summary: 'Update own alumni professional profile', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Profile updated' } } } },
    '/api/career/questions': {
      get: { tags: ['Career Connect'], summary: 'List institution-visible career questions and participant private threads', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Career questions' } } },
      post: { tags: ['Career Connect'], summary: 'Create institution-visible question or private mentor inquiry', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Question created' }, 403: { description: 'Invalid private attachments or mentor' } } }
    },
    '/api/career/questions/{id}/answers': { post: { tags: ['Career Connect'], summary: 'Answer a public question or assigned private inquiry', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Answer posted' }, 403: { description: 'Not authorized' } } } },
    '/api/career/questions/{id}/followups': { post: { tags: ['Career Connect'], summary: 'Add a participant follow-up', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Follow-up posted' } } } },
    '/api/career/connections': { get: { tags: ['Career Connect'], summary: 'List your connection requests and accepted connections', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Connections' } } } },
    '/api/career/connections/{userId}': { post: { tags: ['Career Connect'], summary: 'Request a student-to-alumni connection', security: [{ bearerAuth: [] }], parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Request sent' }, 409: { description: 'Reverse or duplicate request exists' } } } },
    '/api/career/connections/{id}': { put: { tags: ['Career Connect'], summary: 'Accept or reject connection request', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Connection updated' } } }, delete: { tags: ['Career Connect'], summary: 'Remove connection', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Connection removed' } } } },
    '/api/career/mentorship/requests': { get: { tags: ['Career Connect'], summary: 'List private mentorship requests for student or alumni mentor', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Requests' } } }, post: { tags: ['Career Connect'], summary: 'Send a private mentorship request to alumni', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Request sent' }, 409: { description: 'Active request exists' } } } },
    '/api/career/mentorship/requests/{id}': { put: { tags: ['Career Connect'], summary: 'Accept, decline, or cancel private mentorship request', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Request updated' } } } },
    '/api/career/placement/opportunities/{id}': { put: { tags: ['Placement'], summary: 'Update placement drive details', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Drive updated' } } } },
    '/api/career/placement/opportunities/{id}/applications': { get: { tags: ['Placement'], summary: 'List applicants for a placement drive', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Applications' } } } },
    '/api/career/placement/applications/{id}': { put: { tags: ['Placement'], summary: 'Update application status, interviews, selection, or offer status', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Application updated' } } } },
    '/api/applications/{id}/history': { get: { tags: ['Placement'], summary: 'Get authorized application history and interview rounds', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Application history' } } } },
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
        summary: 'Apply and create an Application record; placement eligibility is checked server-side',
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
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users with role/institution filters (admin/dean/principal)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'institution', in: 'query', schema: { type: 'string' } },
          { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated user list' },
          403: { description: 'Insufficient role' },
        },
      },
    },
    '/api/admin/users/{id}/verify': {
      put: {
        tags: ['Admin'],
        summary: 'Admin: verify or unverify user institution',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties: { isVerified: { type: 'boolean' } } },
            },
          },
        },
        responses: {
          200: { description: 'Verification updated' },
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
