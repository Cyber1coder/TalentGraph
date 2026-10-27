# TalentGraph

TalentGraph is a MERN talent intelligence workspace. It connects candidate profiles, recruiter-owned jobs, applications, matching explanations, and MongoDB-backed activity summaries.

## Start locally

Prerequisites: Node.js 20+, npm, and MongoDB Community Server or an Atlas URI.

1. Copy `.env.example` to `.env` and set `MONGODB_URI` and a random `JWT_SECRET` (at least 32 characters). Set `COOKIE_SECURE=true` behind HTTPS.
2. Install dependencies from the repository root: `npm install`.
3. Seed the local database: `npm run seed`.
4. Start API and frontend together: `npm run dev`.
5. Open `http://localhost:5173`; API health is at `http://localhost:4000/api/v1/health`.

Local demo accounts (seed only; password `TalentGraphDemo2026!`): `candidate@talentgraph.local`, `recruiter@talentgraph.local`, and `admin@talentgraph.local`. Never seed or use these credentials in a production database. Seed is upsert-based and safe to rerun.

## Scripts

- `npm run dev` — run the Vite client and Express API.
- `npm run build` — TypeScript check and production builds.
- `npm test` — matching and browser job-form utility unit tests.
- `npm run test:integration -w server` — recruiter job lifecycle API test using an isolated, uniquely named local MongoDB database (the test drops only that database when it finishes).
- `npm run seed` — create companies, 30 profiles, 12 jobs, application stages, saved roles, and an interview.
- `npm run diagnostics` — developer-only `explain("executionStats")` reports for representative queries.

Diagnostics require a configured database and seeded records. Output includes observed examined/returned counts, time, index detail, and dataset size; no benchmark values are prewritten. Run in the same environment and dataset before/after index changes for meaningful comparison. MongoDB server version, hardware, warm/cold cache, and seed scale affect timings.

## Architecture and API

- React, Vite, React Router, TanStack Query, React Hook Form-compatible form components, Zod validation on the server, Recharts dependency, and Lucide icons.
- Express/TypeScript API, Mongoose schemas, HTTP-only cookie auth, bcrypt hashing, role middleware, Helmet, CORS, and rate limits.
- Data model, embedding/reference choices, index rationale, matching formula, status rules, security choices, and known limitations: [docs/architecture.md](docs/architecture.md).
- OpenAPI document: [docs/openapi.yaml](docs/openapi.yaml).

Routes implemented under `/api/v1`: auth register/login/logout/me; public job search/detail; recruiter-owned job listing, create, edit, status transitions, and analytics; candidate profile read/update and recruiter discovery; candidate recommendations and recruiter match ranking; application create/history/status changes; saved jobs; private recruiter notes; interviews; candidate/admin aggregates; admin user status and audit log; health.

Recruiters open **Manage jobs** from the sidebar. Job forms create drafts or publish directly, and listings can be edited, previewed, published, closed, reopened, or archived. Listing counts and application totals come from MongoDB. A deadline entered in the browser's local time zone is converted to an ISO timestamp before submission; the API accepts timezone-qualified ISO dates and validates the exact instant as strictly later than server time. Drafts may omit a deadline. Skills are entered as individual tags and normalized on both client and server; responsibilities are stored one line per array item. Company name is populated from a recruiter-owned Company profile, and edits are allowed only for companies linked to that recruiter. Recruiter list, edit, and status endpoints scope by the authenticated recruiter ID; published jobs use the same public query consumed by candidate discovery.

## MongoDB and privacy

MongoDB is the source for job/profile data and analytics. Embedded bounded profile-owned records keep profile reads together; independently owned jobs, companies, applications, notes, and interviews use ObjectId references. Mongoose defines the unique account email, one-profile-per-user, one-application-per-job/candidate, and one-saved-job-per-candidate/job constraints. Query indexes and their trade-offs are described in architecture docs. Resume data currently supports metadata only; no unsafe public file URL is issued.

Cookies use `HttpOnly`, `SameSite=Strict`, an 8-hour JWT lifetime, and configurable `Secure`. Use HTTPS and same-site client/API deployment in production. Configure a strong secret, narrow frontend origin, and managed MongoDB credentials. Admin registration is intentionally disabled; provision administrators out of band.

## Screenshots

Run the app and capture the landing page, candidate workspace, recruiter workspace, job detail/match view, and profile editor from a browser at desktop and mobile widths. No screenshots are included because the application has not been run in this environment.

## Deployment and current scope

Build with `npm run build`; serve the client `client/dist` from a static host and run `server/dist/index.js` with `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, and `COOKIE_SECURE=true`. Provide HTTPS, secure secrets management, backups, and production index rollout.

Remaining production scope includes recruiter application-review, notes, and interview screens; admin moderation UI and richer audit filtering; refresh/revocable sessions; email verification; resume storage and secure delivery; fuller analytics visualizations/funnel calculations; broader frontend workflow tests; and a production deployment. MongoDB-backed recruiter job lifecycle integration is covered by the dedicated test command above.
