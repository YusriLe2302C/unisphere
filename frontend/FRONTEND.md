# UniSphere frontend foundation

The repository contains an Express and MongoDB backend in `../backend/`; the React application and its tooling live in `frontend/`. Backend files are not part of the frontend build. The client uses the backend's documented JWT bearer-token flow and its existing `/api` route mount.

## Structure

```text
frontend/
  src/
    app/                 Providers and router composition
    assets/              Frontend images and static assets
    components/          Shared UI, navigation, feedback, and form components
    features/            Route-level product areas
    layouts/             Public and authenticated application shells
    services/            API client, upload helper, and feature API modules
    styles/              Tailwind entry point, theme tokens, and global styles
    types/               Shared API and domain types
    utils/               Storage and small pure helpers
  package.json           Frontend scripts and dependencies
  vite.config.ts         Vite and Tailwind plugin configuration
```

Feature-owned components and hooks should stay with their feature until another feature needs them. Promote genuinely shared elements into `components/`. Route definitions belong in `app/router`; shared providers belong in `app/providers`.

## Commands

Run commands from `frontend/`:

```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Environment

Copy `.env.example` to `.env.local`. `VITE_API_BASE_URL` is the public backend origin, such as `http://localhost:5000`; the API client appends `/api`. Vite exposes `VITE_*` values in browser bundles, so only public URLs and configuration belong there. Never put JWT secrets, database credentials, or other server secrets in frontend variables.

## Routing and authentication

Use `createBrowserRouter` and nest feature routes under `PublicLayout` or the authenticated `AppLayout`. `ProtectedRoute` handles session initialization, redirects signed-out users to `/login`, and accepts optional backend role allowlists. The backend roles are `student`, `alumni`, `faculty`, `dean`, `principal`, `admin`, and `superadmin`.

The backend returns `{ token, user }` from login and expects `Authorization: Bearer <JWT>` on protected routes. `AuthProvider` persists this session in local storage, validates it through the actual `GET /api/auth/me` route on startup, and revokes it through `POST /api/auth/logout`. A 401 from protected API calls clears the session. Logout clears local state immediately, then makes a best-effort revocation request.

## API integration

Import `apiRequest` from `src/services/api`. It accepts a relative path below `/api`, standard `RequestInit` options, a token, and a `query` map. It serializes JSON bodies, leaves `FormData` boundaries to the browser, handles empty 204 responses, and throws `ApiError` with the backend message, status, and validation details. Query arrays become repeated query parameters. Backend pagination varies by legacy route; use the shared pagination types while modeling each response from its actual route implementation. Add file uploads via `uploadFile`, which follows the documented `POST /api/files` multipart `file` field.

Add feature endpoint methods only after checking the corresponding backend route and response. Do not treat the API reference's endpoint inventory as a complete payload contract; legacy response formats vary. Do not add mock API responses or fixture data to application features.

## Conventions

- React components and providers use PascalCase filenames and named exports; hooks use the `useThing` convention.
- Keep TypeScript strict. Use explicit request/response types at the service boundary and avoid `any`.
- Put user-visible async errors through `ApiError.message` and shared toast feedback; preserve form-local errors where they aid correction.
- Keep loading, empty, and error states explicit in feature pages. Use the shared `LoadingScreen` for app-level session initialization.
- Use semantic HTML, accessible labels, keyboard-operable controls, and design tokens from `src/styles/index.css`.
- Build feature APIs under `src/services/<feature>/` and feature UI under `src/features/<feature>/`; do not fetch directly from components.

## Design system and component library

- `src/styles/tokens.css` defines the RNS burgundy and ivory palette, semantic states, type scale, weights, spacing, radii, shadows, transitions, focus ring, and responsive breakpoints. Tailwind theme values are mapped from the same brand palette.
- `src/components/ui` exports the reusable typed library from its `index.ts` barrel. Component selectors use the `us-` prefix; variants and sizes are props rather than feature-specific styles.
- Form controls use native inputs, labels, select elements, and buttons. `FormField` associates the label, required state, hint, and validation error with its control.
- Tabs support arrow keys, Home, and End. Native `<details>` powers the disclosure menu. Modal and drawer use the browser's modal dialog behavior for Escape handling and focus containment.
- The showcase is available at `/design-system` and demonstrates tokens and component states without calling the API or adding application fixture data.

Available exports include `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `SearchInput`, `Checkbox`, `Radio`, `Switch`, `FormField`, `Label`, `Card`, `Badge`, `Avatar`, `Tooltip`, `Dropdown`, `DropdownItem`, `Modal`, `Drawer`, `Tabs`, `Pagination`, `Table`, `Skeleton`, `Spinner`, `EmptyState`, `ErrorState`, `Toast`, `Breadcrumbs`, `ProgressBar`, `StatCard`, `FileUpload`, and `ConfirmationDialog`.

## Implemented route map

Public routes:

- `/` — institutional landing page.
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/reset-password/:token`, `/verify-email`, `/verify-email/:token` — backend-backed authentication flows, subject to backend support and configuration.
- `/design-system` — component showcase.

Authenticated routes are nested under `/app` and render inside the role-aware shell. The dashboard at `/app` selects a view using the authenticated role. Shared routes available from the header or profile menu include `/app/notifications`, `/app/profile`, `/app/settings`, `/app/search?q=...`, and `/app/people/:id`.

Feature routes:

- Academics and calendar: `/app/academics`, `/app/academic-activities`, `/app/calendar`.
- Announcements and events: `/app/announcements`, `/app/events`, `/app/events/:eventId`, `/app/events/mine`, `/app/events/create`, `/app/events/manage`.
- Research: `/app/research`, `/app/research/publications`, `/app/research/datasets`, `/app/research/my-work`, `/app/research/submit`, `/app/research/papers/:paperId`, `/app/research/reviews`, `/app/research/collaborations`, `/app/research/collaborations/requests`, `/app/research/collaborations/:collaborationId`, `/app/research/new-collaboration`.
- Career Connect and alumni: `/app/career-connect`, `/app/career-connect/alumni`, `/app/career-connect/questions`, `/app/career-connect/questions/:questionId`, `/app/career-connect/connections`, `/app/mentorship`, `/app/conversations`, `/app/conversations/:conversationId`, `/app/alumni`, `/app/opportunities`.
- Placements: `/app/placements`, `/app/placements/opportunities`, `/app/placements/opportunities/:opportunityId`, `/app/placements/applications`, `/app/placements/applications/:applicationId`.
- Administration: `/app/users`, `/app/reports`, `/app/administration`, `/app/submissions`.

The sidebar exposes role-specific subsets of these routes. Route presence is not a replacement for backend authorization: API calls remain governed by backend permissions and return visible error states on denial.

## Backend integration boundaries

- Set `VITE_API_BASE_URL` to the backend origin (without `/api`); the client appends `/api`. The checked-in `.env.example` points at local development only. A production deployment must supply its actual public API origin and backend CORS configuration.
- Protected API requests use `Authorization: Bearer <JWT>` as required by the backend. The existing auth provider persists the session in browser local storage, refreshes it with `/auth/me`, clears it on 401, and calls `/auth/logout` on sign out. The backend does not use cookie authentication for this frontend integration.
- Use `apiRequest` and the feature service modules rather than component-level fetch calls. JSON requests are serialized centrally; uploads use the browser-created multipart boundary through `uploadFile` and `POST /files`.
- API response and pagination shapes differ between backend routes. Keep types specific to each endpoint and do not assume a universal pagination envelope.
- Shared profile editing uses `PUT /users/profile/me`; alumni career fields use `PUT /career/alumni/profile`; profile images use `/files` followed by the returned file ID. Notification listing/read/preferences use `/notifications`. Global search uses the existing `/users?q=...` directory search and is therefore people search, not full-text search across every module.

## Unsupported or partial capabilities

These are intentionally not presented as working controls because the current frontend/backend contracts do not provide the required feature:

- `/app/community` currently displays a placeholder. The backend has community routes, but the frontend does not implement that domain yet.
- Academic attendance counts and percentages are not returned by the academic timetable/calendar APIs currently integrated. The Academics view labels those values unavailable instead of treating them as zero; attendance thresholds cannot be applied to records the API does not provide.
- Settings can save notification preferences and profile privacy options. There is no authenticated password-change endpoint or persisted display-preference endpoint. Password reset is available through the existing recovery flow.
- Profile editing follows the backend’s writable profile fields; email, phone, role, and other server-managed fields are not edited through the profile form.
- Search results cover people only because the current search endpoint is user discovery. Notification records without a known route target still show their details and remain readable, but do not get a guessed destination.
- The Career Connect alumni directory returns active alumni from the signed-in user’s institution; it is not a student directory. Student profile details come only from the general user search/profile endpoints and must continue to follow their privacy-filtered response.
- Mentorship request responses expose only the student fields selected by the backend (name, avatar, and institution). The mentorship interface intentionally does not display additional academic or contact details.
- The message composer currently supports text only and does not subscribe to the backend’s realtime message events. New incoming messages appear after the conversation is reloaded; backend-supported message attachments and realtime updates are not frontend capabilities yet.

## QA scope and verification

Run `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build` from this directory. These validate static code and production bundling; they do not exercise authenticated user journeys or prove backend availability. Full assistive-technology testing and live API workflows require a backend, test accounts for each role, and representative records. Do not report those as verified based on a successful build alone.

The existing QA environment’s `http://localhost:5000` service does not match the checked-in backend contract: `GET /api/health` returned `{"status":"ok"}` rather than the response defined in `backend/src/app.ts`, and `GET /api/docs.json` and `GET /api/auth/me` returned 404 although those routes are registered in the checked-in backend. Do not point the production frontend at that service until its version and route mount are reconciled.

For a local authenticated smoke test, the checked-in backend was started on port 5001 and the frontend was pointed at it with process-local overrides; no environment files or backend source were changed. The confirmed disposable `uniglobe_db` was seeded and restored after testing. API health and documentation returned 200, and all five seeded demo accounts passed login and `/auth/me` with their expected roles. The alumni UI login, profile save, session persistence, and logout were exercised. Eight alumni routes were checked at 320, 375, 768, and 1280 CSS pixels with no horizontal overflow or browser/page errors. The API returned the expected empty career-question, mentorship-request, connection, and conversation collections, plus one Berkeley opportunity. The seed contains no career questions, mentorship requests, connections, or conversations, and no compatible same-institution student/alumni pair, so answer, accept/reject, connection, and send-message actions were not end-to-end tested. The directory correctly excludes the sole seeded Berkeley alumnus (the signed-in user).

Latest QA checks: TypeScript, ESLint, Prettier, and the production build pass. Vite emits a bundle-size advisory for the main JavaScript chunk (697.18 kB before gzip, 187.02 kB gzip). Earlier public-route checks covered the landing, authentication, and design-system routes at reported viewport widths of 1152, 819, 614, 312, and 256 CSS pixels. The backend dependency install reported 3 audit findings (1 moderate, 2 high); they were not changed as part of this frontend task.
