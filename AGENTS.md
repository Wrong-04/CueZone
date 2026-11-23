# CueZone — Agent Guidelines (Claude & Pi)

- Communication, UI display strings, notifications, comments, and commit messages: **Vietnamese**.
  Code identifiers and file names: **English**.
- No mock data, fake tokens, or confidential information in production code.
  Prioritize replacing legacy `src/mock/` pages with real backend APIs when relevant.
- Fix root causes with minimal diffs; reuse existing code before introducing new abstractions or dependencies.
  Mark deliberate constrained trade-offs with `// ponytail:` comments stating the limitation and upgrade path.

## Operational Permissions

- **MongoDB / Mongoose**: Database reads/writes, index changes, migrations/seeds, fixtures and destructive DB actions are authorized within the requested task; no separate project-guard approval is required in full-permission mode. Never infer production is a test target.
- **Environment variables (`.env`)**: Editing is authorized within the requested task; do not print or commit credentials.
- **Git**: `add`, `commit`, `merge`, `pull`, `push`, history rewrites, destructive operations and PR/release/deploy are authorized when part of the requested task; stage only files in scope.
- **Full-permission mode (enabled at the user's request for this checkout)**: `.claude/bypass-approvals` disables CueZone project-guard confirmation and blocking in Pi and Claude, including DB, `.env`, and destructive Git protection. This is not a sandbox or global configuration; host, CLI, OS, and organization controls may still block.
- **Docker**: No separate guard applies during local development; this does not grant permission to delete data.

## Scoped Rules (Read Before Modifying)

- `frontend/**`: Read `.claude/rules/frontend.md`.
- `backend/**`: Read `.claude/rules/backend.md`.
- Modifying both scopes: Read both. These are the shared canonical sources;
  Claude loads via `paths`, while Pi must read the corresponding files explicitly (Pi does not automatically interpret `.claude/rules`).
- Implementation, bug fixing, or change handover: Read skill
  `.claude/skills/cuezone-delivery/SKILL.md` and follow its procedure.

## Frontend Engineering Conventions

- **Standard 4-Layer Architecture in `.tsx` files**:
  1. `Imports`: Group in order: External libraries (`react`, `@ant-design/icons`...) -> Internal hooks/utils/services -> Sub-components/Modals -> Types/Styles.
  2. `Types & Interfaces`: Define at the top of the file (or extract into a dedicated `types/` directory).
  3. `Constants & Helpers`: Define constants, status dictionaries, templates, and format functions **outside the component** to prevent memory re-allocation on every render.
  4. `Main Component`: Structure top-down: `Props & State Hooks` -> `Derived State (useMemo)` -> `Event Handlers (useCallback / actions)` -> `Effects (useEffect)` -> `Early Returns` -> `Main Render JSX`.
- **Module Splitting Threshold**: When a `.tsx` file exceeds 400 lines or contains multiple complex modals/tables, modularize into a feature folder:
  `[feature]/` containing `components/` (sub-views, cards, tables), `modals/` (popups, forms, confirmation dialogs), and `types/` (interfaces, constants, formatters).
- **UI Copywriting & Anti-Orphan Text**:
  - Use natural, friendly Vietnamese for end-users; avoid leaking backend/technical jargon to the UI (e.g., avoid "database", "ACID", "audit trail", "business warning", "F&B inventory restocking").
  - Prevent orphan words: All action buttons, table column headers, and status tags must include `whitespace-nowrap` to prevent awkward text wrapping on compact screens.

## Mandatory Verification

- Run `pnpm build` before handover; for frontend changes, also run `pnpm --filter frontend lint`.
- Modifying Auth/POS/Session/Booking: Run `pnpm --filter backend check:pos`.
  Requires MongoDB replica set / Atlas for testing; do not run against production data.
- Pre-commit/stop hooks only verify diff formatting and build; they do not prove linting, integration testing, or code review.

## Independent review before completion

- Subagent được phép review độc lập, chỉ đọc. Trước khi hoàn tất mỗi nhiệm vụ triển khai,
  chạy reviewer dùng skill `code-reviewer` trong context/session mới, với cùng provider/model
  đang dùng để code. Với Pi, truyền `model: "inherit"` để lấy model của phiên cha đang chạy,
  không lấy model mặc định lưu trên đĩa. Giữ reviewer tách biệt với implementer;
  không kế thừa/fork transcript hoặc truyền diễn giải triển khai của phiên cha.
- Give requirements/acceptance criteria, workspace/baseline when available, changed
  paths and read-only authority. Reviewer inspects actual files/diff and relevant
  callers for correctness, regressions, safety and project conventions. Split large
  reviews into bounded scopes without dropping cross-file integration checks.
- Subagent must re-run automated checks (`pnpm build`, `pnpm --filter frontend lint`,
  corresponding integration tests) on the actual source code and verify no remaining issues.
- Parent verifies findings, fixes critical/high issues, reruns affected checks and
  requests recheck. Reviewer claims alone are not verification; report remaining risks.
- Nếu model đang code, công cụ hoặc skill review không khả dụng, hoặc review thất bại,
  báo file thay đổi, kết quả kiểm tra và blocker; hỏi người dùng cách tiếp tục.
  Không tự đổi model, tự review thay thế, thử lại vô hạn hoặc tuyên bố hoàn tất.

## Configuration & Maintenance

- Claude: `CLAUDE.md`, `.claude/settings.json`; Pi: `.pi/settings.json`, `.pi/extensions/`.
- Reloading, audit commands, and hook boundaries: Read `AGENT_SETUP.md` when modifying agent configuration.
- Stack skills: `.agents/skills/cuezone-{react,antd,vite,node,mongodb}/`; load only relevant skills.
- Do not modify personal configurations, tokens, MCPs, or global permissions to resolve project-level errors.
- Once you have completed a task, you can assign a subagent to use a skill for code review, in order to check the work you have just done.
