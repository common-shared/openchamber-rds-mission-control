# Change Proposal: Deterministic Lifecycle Management & Release Verification

## Motivation
The `openchamber-rds-mission-control` repository provides an OpenChamber desktop extension that integrates real-time telemetry, steerable autonomy, and session launching into OpenChamber. To ensure reliability across diverse runtime environments—ranging from configured workstations to raw Linux servers—and to prevent configuration drift or corrupted state, the extension requires an automated, robust lifecycle management system.

The system must support:
1. **Clean Installation from Scratch**: Idempotent installation that eliminates stale build artifacts and caches.
2. **Deterministic Lifecycle Commands**: `install`, `update`, `remove` (uninstall), `doctor` (health verification), and `run` (daemon management).
3. **Raw Linux Server Support**: Automatic detection and handling of OS dependencies (Node.js >= 20, npm, git), OpenChamber installation, and user service management.
4. **OpenChamber Extension Governance**: Automated registration in OpenChamber's `extensions.json`, capability grants (`prompt`, `sessions`, `files`, `model`, `filesystem`), capability scopes (`/tmp/opencode/**`, `~/.openchamber/**`), and storage IDs.
5. **Strict Release Verification Invariant**: A mandatory release verification protocol (`verify-release`) executed against live servers before any version release.

## Scope of Changes
- **Core Engine**: `scripts/installer.mjs` offering Node.js API and CLI commands for `install`, `update`, `remove`, `doctor`, `run`, and `verify-release`.
- **CLI Executable**: `bin/mission-control.mjs` registered in `package.json` `bin` for direct execution via npm or npx.
- **Universal Shell Script**: `scripts/install.sh` for headless and interactive installation on raw Linux servers.
- **NPM Scripts**: `npm run install:extension`, `npm run update:extension`, `npm run remove:extension`, `npm run doctor`, `npm run verify:release`.
- **Enduring Documentation**: Operational runbook update (`docs/operations/extension-operations.md`), dedicated installation guide (`docs/operations/installation-and-lifecycle-guide.md`), ADR 0002 (`docs/decisions/0002-deterministic-lifecycle-and-release-verification.md`), comprehensive `README.md`, and updated `AGENTS.md` specifying the release verification rule.
- **Testing**: Automated test suite (`tests/installer.test.ts`) validating CLI routing, registration JSON reconciliation, capability grant enforcement, and health diagnostics.
