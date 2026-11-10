# CueZone — Agent Guidelines (Claude & Pi)

- Communication, UI display strings, notifications, comments, and commit messages: **Vietnamese**.
  Code identifiers and file names: **English**.
- No mock data, fake tokens, or confidential information in production code.
  Prioritize replacing legacy `src/mock/` pages with real backend APIs when relevant.
- Fix root causes with minimal diffs; reuse existing code before introducing new abstractions or dependencies.
  Mark deliberate constrained trade-offs with `// ponytail:` comments stating the limitation and upgrade path.

## Operational Permissions

- **MongoDB / Mongoose**: Free to read. Data writes, index creation, migrations/seeds, and tests that create DB fixtures require explicit permission for the target DB/scope before execution.
- **Environment variables (`.env`)**: Reading `.env` and key files is permitted; editing requires explicit approval. Never log secret values or commit them to Git.
- **Git**: Normal `add`, `commit`, and `push` commands are permitted after running required checks and review; only stage files belonging to the task scope (do not bundle existing uncommitted user changes).
  Destructive operations (`reset`, `checkout`, `restore`, `clean`, `rebase`, `commit --amend`, `push --force`, `push -f`, `push --delete`, `+ref`, `:ref`) and PR/release/deploy operations require explicit approval.
- **Docker**: No separate guard applied during local development; this does not grant permission to delete data.

## Scoped Rules (Read Before Modifying)

- `frontend/**`: Read `.claude/rules/frontend.md`.
- `backend/**`: Read `.claude/rules/backend.md`.
- Modifying both scopes: Read both. These are the shared canonical sources;
  Claude loads via `paths`, while Pi must read the corresponding files explicitly (Pi does not automatically interpret `.claude/rules`).
- Implementation, bug fixing, or change handover: Read skill
  `.claude/skills/cuezone-delivery/SKILL.md` and follow its procedure.

## Mandatory Verification

- Run `pnpm build` before handover; for frontend changes, also run `pnpm --filter frontend lint`.
- Modifying Auth/POS/Session/Booking: Run `pnpm --filter backend check:pos`.
  Requires MongoDB replica set / Atlas for testing; do not run against production data.
- After every task, dispatch a subagent with the `code-reviewer` skill to review diffs before handover.
  The subagent must re-run automated checks (build, lint, corresponding integration tests) on the actual source code and verify no remaining issues.
  If tooling/skills are missing or the test environment is unavailable, report a blocker; do not claim checks have passed.
- Pre-commit/stop hooks only verify diff formatting and build; they do not prove linting, integration testing, or code review.

## Configuration & Maintenance

- Claude: `CLAUDE.md`, `.claude/settings.json`; Pi: `.pi/settings.json`, `.pi/extensions/`.
- Reloading, audit commands, and hook boundaries: Read `AGENT_SETUP.md` when modifying agent configuration.
- Stack skills: `.agents/skills/cuezone-{react,antd,vite,node,mongodb}/`; load only relevant skills.
- Do not modify personal configurations, tokens, MCPs, or global permissions to resolve project-level errors.
