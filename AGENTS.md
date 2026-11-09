# CueZone — Agent Guidelines

Standards and instructions for AI agents working on CueZone (Billiards Club Management System).

---

## 1. Non-negotiables

- **No Mock or Fake Data**: Never commit mock data or fake tokens to production code. Priority is to replace legacy `src/mock/` pages with real backend APIs.
- **Frontend UI & State**:
  - Always import UI components from `shared/ui` via relative paths (e.g. `../shared/ui`). Never import directly from `antd`, and do not use an alias like `@shared/ui` (not configured).
  - Use icons from `@ant-design/icons` instead of raw emojis.
  - Use Tailwind tokens backed by CSS variables (`brand*`, `status-*`, `bg-*`, `text-*` in `tailwind.config.js` and `index.css`).
  - `localStorage` stores **only** tokens (`accessToken`, `refreshToken`). User profile is always rehydrated from `/auth/profile`.
- **Backend & Database**:
  - Every API response must use the standard envelope: `{ success: boolean, message?: string, data?: any }`.
  - Positional routing: Any route attached to `protectedRouter` is automatically guarded by JWT middleware. Do not reach for decorators.
  - POS Session: `currentSession` is an embedded subdocument on `Table` (no separate collection). Duration and cost are always derived on the fly via `playingDetails()` in `session.service.ts` — **never store computed totals**.
  - Transactions & Concurrency: All table and session state transitions (open, pause, transfer, merge, checkout, booking holds) must run inside `mongoose.connection.transaction()`. Always include `sessionId`/`status` in queries to prevent lost updates; unique index on `Invoice.sessionId` guarantees idempotent checkouts.
- **Language & Conventions**:
  - User-facing strings, UI messages, commit messages, and comments: **Vietnamese**.
  - Code identifiers (variable, function, type, and file names): **English**.
  - Minimal diffs: Address the root cause directly. Mark deliberate trade-offs with `// ponytail:` comments stating the ceiling and upgrade path.
- **Handoff & Review Workflow**:
  - After completing any task, launch a subagent using the `code-reviewer` skill to review diffs and verify quality before handoff.

---

## 2. Commands

pnpm workspace (`frontend`, `backend`):

```bash
pnpm install                      # Install dependencies across workspaces
pnpm dev                          # Run backend (:5000) & frontend (:5556) concurrently
pnpm build                        # Production build for both workspaces (required before handoff)
pnpm --filter frontend lint       # Run frontend linter (oxlint)
pnpm --filter backend check:pos   # Integration test suite (Auth/POS/Booking, requires MongoDB replica set / Atlas)
```

> **Testing note**: `backend/scripts/check-pos.cjs` is the primary integration test suite. Run it whenever modifying Auth, POS, Session, or Booking logic.

---

## 3. Architecture Quick Reference

### Backend (`/backend`)
- **Entry points**: `src/app.ts` (Express setup), `src/server.ts` (HTTP server + Socket.io; awaits `*.init()` to ensure unique indexes exist before listening).
- **Authentication & Roles**: Positional middleware through `publicRouter` (`/auth`, `/products`, public endpoints) and `protectedRouter`. `requirePosStaff` re-checks user status from MongoDB on each request and permits only `admin`, `staff`, and `cashier`. Full role definitions live in `UserRole` (`modules/user/user.model.ts`).
- **Module Structure**: `src/modules/<domain>/{model,service,routes}.ts`. Prefer inline route handlers in `routes.ts` forwarding errors to `next(err)`.
- **Realtime**: Socket.io singleton in `utils/socketHolder.ts`, broadcasts `notification:new` events.

### Frontend (`/frontend`)
- **Stack**: Vite, React 19, react-router v6, Tailwind CSS, Ant Design wrapped in `frontend/src/shared/ui`.
- **Routing**: Centralized in `src/App.tsx`: `/login`, `/register`, `/admin` (guarded by `AdminLayout` and `ProtectedRoute`), `/customer` (customer-facing view).
- **API Client**: `services/api.ts` (Axios instance with automatic token injection and single 401 refresh retry). Reference service pattern: `services/pos.service.ts`.
