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
- **Git**: Các thao tác Git thông thường gồm `add`, `commit`, `merge`, `pull`, và `push` được phép thực hiện thoải mái trong quá trình phát triển (chỉ stage các file thuộc phạm vi task, không gom các file dirty chưa commit của người dùng).
  Chỉ các thao tác mang tính phá hủy hoặc ghi đè lịch sử (`push --force`, `push -f`, `reset --hard`, `clean -fd`, xóa branch từ xa `push --delete`) và PR/release/deploy mới cần phê duyệt.
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
- Pre-commit/stop hooks only verify diff formatting and build; they do not prove linting, integration testing, or code review.

## Independent review before completion

- Subagents are authorized for read-only independent review. Before completing each
  implementation task, launch a different reviewer using the code-reviewer skill
  in a fresh context/session with model `zuu/gpt-6.1-sol`. Select it explicitly;
  for Pi pass model: "zuu/gpt-6.1-sol". Do not reuse the implementer, inherit/fork
  the parent transcript or pass its implementation narrative.
- Give requirements/acceptance criteria, workspace/baseline when available, changed
  paths and read-only authority. Reviewer inspects actual files/diff and relevant
  callers for correctness, regressions, safety and project conventions. Split large
  reviews into bounded scopes without dropping cross-file integration checks.
- Subagent must re-run automated checks (`pnpm build`, `pnpm --filter frontend lint`,
  corresponding integration tests) on the actual source code and verify no remaining issues.
- Parent verifies findings, fixes critical/high issues, reruns affected checks and
  requests recheck. Reviewer claims alone are not verification; report remaining risks.
- If the exact model, review tool or skill is unavailable, or review fails, report
  changed files, checks and the blocked review; ask the user how to proceed. Never
  silently substitute a model, self-review instead, retry endlessly or claim completion.

## Configuration & Maintenance

- Claude: `CLAUDE.md`, `.claude/settings.json`; Pi: `.pi/settings.json`, `.pi/extensions/`.
- Reloading, audit commands, and hook boundaries: Read `AGENT_SETUP.md` when modifying agent configuration.
- Stack skills: `.agents/skills/cuezone-{react,antd,vite,node,mongodb}/`; load only relevant skills.
- Do not modify personal configurations, tokens, MCPs, or global permissions to resolve project-level errors.
