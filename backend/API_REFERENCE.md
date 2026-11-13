# UNIVERSE Backend Reference

This document describes the Express API mounted by `src/app.ts`. JSON APIs use `Content-Type: application/json`; file upload and replacement routes use `multipart/form-data` with a `file` field. IDs are MongoDB ObjectIds unless stated otherwise. List APIs use the query parameters shown in the route source; pagination conventions are not yet uniform across every legacy route.

## Authentication

Register at `POST /api/auth/register`, sign in at `POST /api/auth/login`, then send `Authorization: Bearer <JWT>` to protected APIs. JWTs carry an account token version; logout, suspension, and password reset revoke older tokens. Socket.IO clients pass the token through `auth: { token }` during the handshake. Public registration permits student, faculty, and alumni roles only.

## Endpoint inventory

| Prefix | Methods and endpoint patterns | Access |
|---|---|---|
| `/api/auth` | `POST /register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/create-authority`, `/demo-login`; `GET /me`, `/verify-email/:token`; `PUT /users/:userId/role`, `/users/:userId/responsibilities` | Public auth flows; JWT for account management; elevated role checks on authority routes |
| `/api/users` | `GET /`, `/:id`; `PUT /profile/me`, `/responsibilities`; `POST /projects`, `/achievements`, `/:id/follow`; `DELETE /projects/:projectId` | Public discovery/profile where configured; JWT for mutations |
| `/api/posts` | `GET /`, `/feed/institution`, `/feed/personalized`, `/:id`; `POST /`, `/:id/event-register`, `/:id/record-attendance`, likes/dislikes/bookmark/share, comments/replies; `PUT /:id`; `DELETE /:id` | Public/optional-auth reads; authenticated mutations with ownership checks |
| `/api/announcements` | `GET /`, `/:id`; `POST /`, `PUT /:id`, `DELETE /:id` | JWT; institutional/author checks |
| `/api/communities` | `GET /`, `/:idOrSlug`, `/:id/posts`; `POST /`, `/:id/join`, member approval, advisor/moderator assignment, announcements/resources; `PUT /:id`; `DELETE` community/member/resource/advisor/moderator paths | Public reads; JWT membership, moderator, creator, and advisor checks |
| `/api/opportunities` | `GET /`, `/:id`; `POST /`, `/:id/apply`; `DELETE /:id` | Public discovery; JWT creation/application; server-side placement eligibility |
| `/api/applications` | `POST /`; `GET /my`, `/target/:targetId`, `/target/:targetId/export`, `/:id/history`; `PUT /:id/status`; `DELETE /:id` | JWT; applicant, poster, club moderator, or placement authority scope |
| `/api/events` | `GET /`, `/:id`, `/calendar/list`, `/:id/registrations`; `POST /`, `/:id/submit`, `/review`, `/publish`, `/cancel`, `/register`, attendance and calendar; `PUT /:id`, `/calendar/:calendarId`; `DELETE /:id/register/:registrationId` | JWT; event owner/advisor/institution authority; participant checks |
| `/api/research` | `GET /`, `/:id`, collaboration and faculty/research group discovery; `POST /`, `/collaborations`, collaboration applications; `PUT /:id`, collaboration paths; `DELETE /:id`, collaboration paths | Public/optional reads; JWT and project/reviewer ownership checks |
| `/api/research` workflow | `GET /assignments`, `/papers/mine`, `/papers/:id/reviews`; `POST /assignments`, reassignment, `/papers/:id/resubmit`, `/reviews`, `/publish`, collaboration review | JWT; assigned reviewer, R&D authority, and author checks |
| `/api/career` | Alumni profile/discovery; questions, answers, follow-ups; connections; mentorship requests; placement opportunity/application oversight | JWT; institution and participant privacy checks |
| `/api/timetable` | `POST /revisions`, `/revisions/:changeSetId/publish`; `GET /department/:department`, `/me` | JWT; timetable coordinator/institution authority for writes; own institution/student/faculty reads |
| `/api/files` | `POST /`; `GET /:id`; `PUT /:id/replace`; `DELETE /:id`; `POST /maintenance/orphans` | JWT; entity-aware file access and owner/authority rules |
| `/api/notifications` | `GET /`, `/preferences`; `PUT /read-all`, `/:id/read`, `/preferences`; `DELETE /clear-read`, `/:id`; `GET /delivery/retry` | JWT; recipient ownership; platform admin for retries |
| `/api/messages` | `GET /conversations`, `/conversations/:id/messages`; `POST /conversations/direct`, `/conversations/group`, `/conversations/:id/messages`, `/messages/:id/read` | JWT; conversation membership and institution checks |
| `/api/subscriptions` | `GET /my`, `/check`; `POST /`, `/toggle`; `PUT /:id/preferences`; `DELETE /:id` | JWT; own subscription |
| `/api/admin` | Reports, stats, institution stats, user list/verification/role/responsibility/status/discipline, report review, audit listing/verification, post/community moderation | JWT and role scope; platform admin global, Dean/Principal institution-scoped |
| `/api/analytics` | `GET /overview` | JWT; institution-scoped aggregation |
| System | `GET /api/health`, `/api/docs.json`; Swagger UI at `/api/docs` | Public |

The precise request validators and response fields are defined in the route handlers and schemas; `/api/docs` is the executable OpenAPI document. Swagger coverage is incomplete for legacy endpoints and should not be treated as a complete contract yet.

## Examples

### Create a timetable revision

```json
POST /api/timetable/revisions
{
  "institution": "Example University",
  "slots": [{
    "department": "CSE", "academicYear": "2026-2027", "semester": 3, "section": "A",
    "dayOfWeek": 1, "startMinutes": 540, "endMinutes": 600,
    "courseCode": "CS301", "courseName": "Algorithms", "facultyId": "<user-id>",
    "roomNumber": "R201", "sessionType": "lecture"
  }]
}
```

Successful staging returns `{ "revision": 2, "changeSetId": "…", "slots": [...] }`; publication is a separate `POST /api/timetable/revisions/:changeSetId/publish`.

### Upload and retrieve a private file

Upload `POST /api/files` as multipart with `file`, `associatedEntityType`, optional `associatedEntityId`, and an access policy. A successful response returns metadata and an ID, never a local path. Download or preview using authenticated `GET /api/files/:id`.

### Submit an application

```json
POST /api/applications
{ "opportunityId": "<opportunity-id>", "roleApplied": "Intern", "resumeFileId": "<private-upload-id>" }
```

Successful submission returns `{ "message": "Application submitted successfully!", "application": { ... } }`. Use the `Idempotency-Key` header for retry-safe submissions.

## Permission summary

| Actor | Scope |
|---|---|
| Admin / superadmin | Platform-wide administration (admin records retain institution scope for audit context) |
| Dean / Principal | Own institution for verification, suspension, responsibilities, reports, moderation, oversight, and audit reads |
| Faculty with scoped responsibility | Only assigned responsibility workflows within the institution; examples include placement coordinator, R&D staff, club advisor, timetable coordinator |
| Student | Own profile, registrations/applications, assigned learning workflows, and authorized conversation participation |
| Alumni | Own career profile, authorized career answers, connections, and mentorship response workflows |

Every route still requires independent authorization review; this table summarizes intended policy, not a substitute for endpoint-level verification.

## Collections

Primary Mongoose models: `User`, `Post`, `Announcement`, `Community`, `Opportunity`, `Application`, `Event`, `EventRegistration`, `AcademicCalendar`, `ResearchPaper`, `ResearchReview`, `ResearchCollaboration`, `MentorshipBinding`, `MentorshipRequest`, `CareerQuestion`, `Connection`, `Conversation`, `Message`, `UploadedFile`, `Notification`, `NotificationPreference`, `Subscription`, `Report`, `Timetable`, `TimetableWriteLock`, `AuditLog`, and `AuditHead`.

MongoDB unique indexes enforce identity, application, connection, conversation, registration, mentorship, and audit constraints where defined. Production rollout requires index creation/migration review against existing data. This codebase does not provide a migration runner or general orphan-record repair process.

## Environment

| Variable | Purpose |
|---|---|
| `PORT` | HTTP server port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string; required in production |
| `JWT_SECRET` | JWT signing key, at least 32 characters |
| `AUDIT_HMAC_SECRET` | Dedicated HMAC key for audit integrity, at least 32 characters; production requires it. Development falls back to `JWT_SECRET` if omitted |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `NODE_ENV` | `development`, `test`, or `production` |
| `CORS_ORIGIN` | Comma-separated explicit browser origin allowlist; wildcard origins are rejected |
| `PLATFORM_MODE` | `cross-college` or `single-college` |
| `PRIMARY_INSTITUTION` | Institution used in single-college mode |
| `FILE_STORAGE_ROOT` | Optional local file storage root; defaults to `backend/uploads` |
| `RESEARCH_WORKFLOW_TEST_DB_URI` | Disposable MongoDB URI required by the research workflow integration script |

Never commit populated secrets. Use a dedicated audit HMAC key in every deployed environment.

## Install and run

```powershell
cd backend
npm.cmd install
npm.cmd run build
npm.cmd run dev       # development watcher
npm.cmd start         # production compiled server
npm.cmd test          # current broad script; see test-safety note below
```

The server requires reachable MongoDB before listening. Socket.IO is attached to the same HTTP server. Local file storage is implemented; S3 and Cloudinary adapters are not yet present.

## Verification and known limitations

- TypeScript build and in-process health/docs/404 smoke checks are available without MongoDB.
- Model validation/index tests are in `src/tests/test_models_and_infrastructure.ts`.
- Most integration tests connect to `MONGODB_URI`; one requires `RESEARCH_WORKFLOW_TEST_DB_URI`. Several legacy cleanup routines are broad. Do not run `npm test` against a shared or non-disposable database.
- MongoDB was reachable on `127.0.0.1:27017`. Auth/RBAC, research workflow, privacy/notifications, PubSub, collaboration matching, college hub, analytics, and end-to-end suites passed against uniquely named test databases. Audit HMAC write/verify and immutable-update behavior also passed against a disposable database. These runs do not cover every route or all race conditions.
- Event registration concurrency in the new Events API, timetable overlap/concurrent writes, file-download authorization, private career-file access, placement eligibility edge cases, and Socket.IO handshake/room/read-receipt behavior still lack isolated end-to-end tests.
- Audit HMAC keys detect unauthorized data edits when the key remains secret, but an operator with database and application secret access can rewrite the chain. Administrative data mutation and audit insertion are not wrapped in a Mongo transaction.
- Notification delivery is persisted and retryable but has no background worker; the admin retry route is a manual trigger. Direct notifications inserted by legacy code paths may not emit realtime events.
- CORS allowlisting is enforced for Express; Socket.IO CORS configuration and production origin behavior need deployment-level integration checks.
- API validation, error response shape, pagination, and Swagger are inconsistent across legacy route modules; full endpoint-by-endpoint contract coverage remains incomplete.
