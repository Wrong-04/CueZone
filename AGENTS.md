# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Also read `AGENTS.md` (Vietnamese) — it holds the binding project rules (no mocks/fake tokens, reuse `frontend/src/shared/ui`, brand tokens, `@ant-design/icons` instead of emoji, minimal diffs). This file is architecture + commands only.

## Commands

pnpm workspace (`frontend`, `backend`). README's `yarn` instructions are stale.

```bash
pnpm install                      # root, installs both workspaces
pnpm dev                          # backend :5000 + frontend :5173 via concurrently
pnpm build                        # both workspaces, run before handoff
pnpm --filter backend dev         # ts-node-dev on src/server.ts
pnpm --filter frontend lint       # oxlint (frontend only; backend has no linter)
pnpm --filter backend check:pos   # the only test suite (see below)
```

`backend/scripts/check-pos.cjs` is the whole test story: one assert-based script that boots the real Express app on an ephemeral port against a **throwaway database** (`cz_check_*`, dropped in `finally`) and walks auth → permissions → booking conflicts → check-in → pause → move/merge → checkout. It needs a MongoDB that supports transactions (replica set / Atlas), not a bare standalone `mongod`. There is no test runner and no way to run a single case — edit the script to narrow it. Run it for any auth / POS / booking change.

Both workspaces need `.env` (copy from each `.env.example`): backend `MONGO_URI`, `JWT_*`, SMTP, Cloudinary; frontend `VITE_API_URL`, `VITE_SOCKET_URL`.

## Backend architecture

`App` (`src/app.ts`) builds Express; `src/server.ts` wraps it in an HTTP server + Socket.io and awaits `Booking.init()` / `Invoice.init()` so unique indexes exist before serving.

Auth is positional, not decorator-based: `src/routes/index.ts` exports `publicRouter` (only `/auth`) and `protectedRouter`, and `app.ts` mounts them as `/api/v1` → inline JWT middleware → `/api/v1`. **Anything added to `protectedRouter` is authenticated by that ordering alone.** Mount order inside `protectedRouter` matters too: `/tables/:id/session` is registered before `/tables`, and `session.routes.ts` uses `Router({ mergeParams: true })` to read `:id`.

`middlewares/auth.middleware.ts` duplicates the JWT check as an exported function + a routing-controllers class; `routing-controllers` and `typedi` are installed but unused — everything is plain Express `Router`s. Don't reach for decorators.

Role checks happen in `middlewares/pos.middleware.ts` (`requirePosStaff`), which re-reads the user from MongoDB on every request to honour `isActive` / `isLocked`, then allows admin/staff/cashier. Roles live in `UserRole` (`modules/user/user.model.ts`): admin, staff, cashier, warehouse, referee, customer.

Module layout is `modules/<domain>/{model,service,routes}.ts` plus optional `controller.ts` and `dto/`. Two styles coexist: older domains (table, user, role, pricing) use a thin `*.controller.ts` that catches errors and returns `{success:false}` with HTTP 200; newer ones (session, booking) put handlers inline in `routes.ts` and pass errors to `next(err)` for the error handler in `app.ts`. Prefer the newer style. `.gitkeep`-only module folders are placeholders for unbuilt features.

Every response is `{ success, message?, data? }` — frontend services rely on this envelope, so keep it.

### POS session model

A play session is an embedded `currentSession` subdocument on `Table`, not its own collection. Elapsed time and cost are derived (never stored) by `playingDetails()` in `session.service.ts` from `startedAt`, `totalPausedMs` and `pausedAt`; `carriedCost` holds cost inherited by a merge, `pricePerHour` is snapshotted so transfers keep the agreed rate. Open/pause/move/checkout each run inside `mongoose.connection.transaction()` and re-query the table with the expected `sessionId`/`status` in the filter, so a stale client gets "vui lòng tải lại" instead of a lost update. `Invoice.sessionId` is unique, which is what makes checkout retry-safe. Booking conflicts are prevented the same way: one held reservation per table via `Table.status = booked` + `bookedInfo.bookingId` inside a transaction.

Realtime is one-way and coarse: `utils/socketHolder.ts` holds the io instance, `notification.service.ts` emits `notification:new`, and `components/layout/AdminLayout.tsx` is the only subscriber (it refetches).

## Frontend architecture

Vite + React 19 + react-router v6, Tailwind, antd. All routing is declared inline in `src/App.tsx` (`frontend/src/routes/` is empty): `/login`, `/register`, an `/admin` tree behind `ProtectedRoute roles={...}` with `AdminLayout`, and a `/customer` tree that is currently **not** auth-gated. Unbuilt admin screens import named stubs from `pages/PlaceholderPage`.

`shared/ui/index.ts` re-exports the full component set (antd wrapped in project styling, plus `message`, `DataTable`, `FloatingInput`). Import from `../shared/ui`, never antd directly. Colors come from Tailwind tokens backed by CSS variables (`brand*`, `primary-*`, `status-*`, `text-*`, `bg-*` in `tailwind.config.js` + `index.css`).

`services/api.ts` is the single axios instance: injects `accessToken`, and on 401 (except auth endpoints) does one `/auth/refresh-token` retry, else clears storage and redirects to `/login`. localStorage holds **only** tokens — `AuthContext` deletes the legacy `cuezone_user` key on mount and rehydrates the user from `/auth/profile`. Keep it that way.

`services/pos.service.ts` is the pattern for new services: typed `ApiResponse` unwrapping through `result()`, Mongo `_id` mapped to `id`, and display-only data (table type labels) derived client-side.

These pages still read from `src/mock/` and are the known gap AGENTS.md refers to: `pages/admin/AdminDashboard.tsx`, `AdminTournamentsPage.tsx`, `RefereeScoringPage.tsx`, `FnBInventoryPage.tsx`, and `pages/pos/PosTableFloorPage.tsx` (F&B stock types only — its table/session/booking data is already live API).

## Conventions

User-facing strings, comments and commit messages are Vietnamese; identifiers are English.

`ponytail:` comments mark deliberate simplifications with their ceiling and upgrade path (e.g. one reservation per table in `booking.service.ts`). Treat them as tracked debt, not bugs to silently "fix".
