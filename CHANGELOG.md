# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-11-22

### Added
- **Deterministic Lifecycle & Installation Engine (`scripts/installer.mjs`)**:
  - Implements clean-from-scratch commands: `install`, `update`, `remove`, `doctor`, `run`, and `verify-release`.
  - Always eliminates stale build artifacts (`status/main.js`) and recompiles bundles freshly via esbuild.
  - Automatically reconciles OpenChamber configuration (`~/.config/openchamber/extensions.json`), managing paths, capability grants (`prompt`, `sessions`, `files`, `model`, `filesystem`), and scopes (`/tmp/opencode/**`, `~/.openchamber/**`).
  - Automatically initializes and verifies telemetry and steering storage at `~/.openchamber/rds-mission-control/`.
  - Restarts or reloads running OpenChamber daemons to immediately activate extensions.
- **Universal Raw Linux Shell Installer (`scripts/install.sh`)**:
  - Self-contained bootstrap installer supporting Ubuntu/Debian, Fedora/RHEL, Arch Linux, and openSUSE.
  - Automatically checks and provisions missing system dependencies (git, curl, build tools, Node.js 20 LTS, OpenChamber CLI).
  - Human- and AI-friendly logging with clear ANSI banners and structured output.
- **CLI Executable (`bin/mission-control.mjs`)**:
  - Registered under `bin.openchamber-rds-mission-control` in `package.json` for direct invocation via npm or npx.
- **Pre-Release Verification Invariant (`verify-release`)**:
  - Strict release gate protocol enforcing clean build from scratch, full unit test pass, combined validation check (`npm run check`), doctor health diagnostics, and central RDS documentation validation (`rds validate`).
  - Added strict policy requirement in `AGENTS.md` and `README.md` mandating that this verification procedure MUST be executed on the repo and server before every release.
- **Diagnostic Health Doctor (`doctor`)**:
  - Evaluates Node.js runtime, npm, OpenChamber binary, daemon status, bundle freshness, registration, capability grants, and writable storage permissions.
- **Enduring RDS Documentation & ADR 0002**:
  - Added `docs/decisions/0002-deterministic-lifecycle-and-release-verification.md` (ADR 0002).
  - Added `docs/operations/installation-and-lifecycle-guide.md` (complete installation manual for human operators and AI agents).
  - Updated `docs/operations/extension-operations.md` with lifecycle runbooks and pre-release gates.
  - Updated `AGENTS.md` and `README.md` with comprehensive guides and release invariants.
- **Automated Unit & Integration Test Suite (`tests/installer.test.ts`)**:
  - 7 new automated tests covering configuration reconciliation, idempotence, unregistration, atomic persistence, doctor diagnostics, and path helpers.

## [0.2.1] - 2026-11-19

### Fixed
- **Multi-Source Real-Time Telemetry Synchronization:** Resolved bug where monitoring panel displayed uninitialized fallback defaults (`M0_EXPLORE`, `T0_INFORMATIONAL`, `Gear 1 [AUTO]`, `dev`, `--/--`) when agent mode was `AUTO`.
- **Bidirectional OpenCode Plugin Sync:** Updated `opencode-rds-enforcer.js` to automatically synchronize prompt-classified Cognitive Phase (M0–M5), Task Impact Class (T0–T5), and inferred Gear into both workspace-local `.openchamber/rds-mission-control/<sessionId>.json` and global `~/.openchamber/rds-mission-control/<sessionId>.json`.
- **SDK Workspace Session Telemetry:** Subscribed to OpenChamber SDK workspace session updates (`listProjects()`, `listSessions()`, `onSessions()`) to capture live token context consumption, active tool execution, and worktree branches directly from OpenChamber.
- **Project & Git Live Probing:** Added direct probes for `.rds/config.json` bootstrap validation and `.git` / `.git/HEAD` worktree branch resolution.
- **Real-Time UDIS Inference Fallback:** In the absence of an on-disk store, `status/main.ts` now deterministically infers the active Cognitive Phase and Impact Class from active session titles and task focus goals.
- **Permission & Capability Expansion:** Added `contributes.filesystem` permissions (`["~/.openchamber/**", "/tmp/opencode/**"]`) in `package.json` to allow full access to OpenChamber runtime stores.

### Added
- Comprehensive test suite in `tests/store.test.ts` covering path resolution, document mutations, parsing fallbacks, and deterministic UDIS prompt classification.

## [0.2.0] - 2026-11-19

### Added
- **Ergonomic Segmented Tabs:** Ultra-compact tabbed interface (`Monitor`, `Steering`, `Launch`) with dynamic height measurement (`host.setHeight`), reducing vertical screen footprint from 400px to ~150–175px to prevent sidebar crowding.
- **Auto-by-Default Steering Architecture:** New sessions default to `🤖 AUTO` mode where the coding agent dynamically determines its own Triad Inception state (Gear, Impact, Concurrency). Manual adjustments stage an explicit `👤 MANUAL OVERRIDE`.
- **Complete Cognitive Archetype Launchers (M0–M5):** Restored missing `M2_STAGE` and `M5_SENSITIVE` session launchers, plus added quick-pick operational presets (`T2 Bugfix`, `Nyquist Tests`, `RDS Doctor`, `As-Built Wrapup`).
- **Extended Monitoring Telemetry:** Live HUD now displays RDS Governance status (`ENFORCED`), active Git branch / worktree isolation status, token context window meter (`used / limit`), live tool activity (`⚡ edit ...`), and focus action progress bar.
- **Real-Time Polling & Manual Refresh Button:** Interactive `[🔄]` refresh button with spin feedback, reactive SDK session lifecycle binding, and animated `[🟢 LIVE]` heartbeat.
- **Session Isolation & Multi-Session Window Support:** Strict per-session cache isolation keyed by `sessionId`, eliminating cross-session telemetry leakage, with an active session ID chip in the header.
- **Worker Stepper Controls:** Replaced overflowing number input box with responsive stepper buttons (`[-] [ 4 ] [+]`) and global `box-sizing: border-box`.

### Changed
- Default manifest height reduced to 175px in `package.json`.
- Updated Steering Protocol Specification to Schema v1.1.0 with `mode`, `requestedAt`, and extended telemetry support.
- Updated Architecture and Operations runbooks to document tabbed ergonomics and autonomous steering workflows.

## [0.1.0] - 2026-11-18

### Added
- Initial standalone release of **RDS Mission Control** OpenChamber desktop extension.
- **Section 1 (Live Telemetry & Mission Monitor):** Real-time monitoring HUD for active Cognitive Phase (`M0`..`M5`), Task Impact Class (`T0`..`T5`), 4-Gear transmission, and active worker count.
- **Section 2 (Turn-Boundary Steering):** Safe runtime steering controls for Gear (1 to 4) and concurrency ceiling with two-phase atomic handshake (`PENDING_NEXT_TURN`).
- **Section 3 (Intelligent Session Launcher):** Pre-fills standard RDS session draft templates and optimal OmniRoute model presets (`pff-deep-auto` and `pff-vision-auto`) into composer.
- Enrolled in Repository Document Standard (RDS v0.8.5) via submodule `.claude/skills/repository-documentation`.
- Added canonical enduring documentation: Architecture, Operations runbook, Steering protocol specification, and ADR 0001.
