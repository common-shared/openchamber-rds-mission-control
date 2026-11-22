# RDS Mission Control for OpenChamber

An OpenChamber desktop status section and control panel providing real-time telemetry, live steerable autonomy, dynamic configuration, and intelligent session launching for the **Repository Document Standard (RDS)** ecosystem.

---

## Capabilities

1. **📡 Tab 1: Live Telemetry & Mission Monitor**
   - Active Cognitive Mode (`M0_EXPLORE` .. `M5_SENSITIVE`)
   - Task Impact Class (`T0_INFORMATIONAL` .. `T5_OPERATIONAL_SENSITIVE`)
   - 4-Gear Autonomy Transmission indicator (`Gear 1` .. `Gear 4` + `[AUTO]`/`[MANUAL]`)
   - RDS Governance enrollment badge (`ENFORCED`, `WARNINGS`, `DEGRADED`, `UNMANAGED`)
   - Active Git branch and worktree isolation guard (`feat/... 🌿` vs `dev ⚠️`)
   - Real-time token context window meter (`used / limit`)
   - Live tool execution indicator (`⚡ edit ...`) and focus actions progress bar
   - Instant manual refresh button `[🔄]` with visual spin feedback and animated `[🟢 LIVE]` heartbeat

2. **⚙️ Tab 2: Safe Turn-Boundary Steering & Runtime Configuration**
   - **Auto-by-Default:** Sessions initialize in `🤖 AUTO` mode where the coding agent determines its own Triad Inception state
   - Manual overrides stage an explicit `👤 MANUAL OVERRIDE` with one-click `↩️ Auto` restore
   - Live Gear selector (1 to 4) and Cognitive Phase redirect
   - Concurrency modulation with no-overflow Worker Steppers (`[-] [ 4 ] [+]`)
   - Emergency Hold button (`🛑 Hold`) to immediately intercept and drop autonomy to Gear 1
   - Safe Atomic Handshake: staged adjustments display as `PENDING_NEXT_TURN` in `.openchamber/rds-mission-control/<sessionId>.json` and cleanly activate at the next safe turn boundary without disrupting active execution

3. **🚀 Tab 3: Intelligent Session Launcher**
   - Complete 6-phase cognitive archetype launchers (`M0_EXPLORE` through `M5_SENSITIVE`)
   - Quick operational task presets (`🛠️ T2 Bugfix`, `🧪 Nyquist Tests`, `🩺 RDS Doctor`, `📦 As-Built Wrapup`)
   - Pre-fills RDS-compliant session draft templates and optimal OmniRoute AI models (`pff-deep-auto` for deep logic, `pff-vision-auto` for multimodal)
   - Opens the composer in OpenChamber desktop without auto-starting, allowing review before dispatch

4. **🪟 Ergonomic Tabbed Interface & Dynamic Height**
   - Segmented navigation tabs (`Monitor`, `Steering`, `Launch`)
   - Measures content and calls `host.setHeight(height)` dynamically, reducing vertical sidebar height from 400px down to ~150–175px to eliminate panel crowding
   - Strict per-session cache isolation keyed by `sessionId` with an active session ID chip (`#ses_...`)

---

## Complete Installation & Lifecycle System (Human & AI Friendly)

The repository provides a complete, robust, and deterministic lifecycle management system designed for human engineers and autonomous AI agents. It supports both already-configured workstations and raw Linux servers.

### 🌟 Key Lifecycle Principles
- **Always Clean Install from Scratch:** Removes stale compiled bundles, installs dependencies fresh, runs typechecks, and re-compiles with esbuild to guarantee zero ghost-state bugs.
- **Automated OpenChamber Reconciliation:** Automatically configures `~/.config/openchamber/extensions.json` with required paths, capability grants (`prompt`, `sessions`, `files`, `model`, `filesystem`), and scopes (`/tmp/opencode/**`, `~/.openchamber/**`).
- **Complete Command Suite:** Provides `install`, `update`, `remove`, `doctor`, `run`, and `verify-release`.

---

### Method 1: Automated Clean Installation (Current Workstation or Server)

If Node.js and git are already present, run the clean installation directly:

```bash
# Clean install from scratch, build bundle, register with OpenChamber, and restart daemon:
npm run install:extension

# Or using the installer CLI directly:
node scripts/installer.mjs install --clean

# Or using the universal shell script:
./scripts/install.sh install
```

What this does automatically:
1. Purges previous build bundle (`status/main.js`).
2. Runs TypeScript typechecking (`tsc --noEmit`).
3. Compiles production browser bundle (`status/main.js`) via esbuild.
4. Registers the extension path in OpenChamber's `~/.config/openchamber/extensions.json`.
5. Grants all 5 required capabilities (`prompt`, `sessions`, `files`, `model`, `filesystem`).
6. Configures filesystem capability scopes for `/tmp/opencode/**` and `~/.openchamber/**`.
7. Creates and verifies writable storage directory at `~/.openchamber/rds-mission-control/`.
8. Restarts the running OpenChamber daemon (if active) so changes take effect immediately.
9. Runs diagnostic health checks (`doctor`) and outputs a structured verification report.

---

### Method 2: Raw Linux Server Installation (Ubuntu/Debian, Fedora/RHEL, Arch, openSUSE)

On a raw or newly provisioned Linux server with minimal dependencies installed:

```bash
# 1. Clone repository
git clone https://github.com/common-shared/openchamber-rds-mission-control.git
cd openchamber-rds-mission-control

# 2. Run universal bootstrap installer
./scripts/install.sh install
```

The universal bootstrap script:
- Checks Linux distribution (`/etc/os-release`).
- Automatically provisions `curl`, `git`, and build tools if missing.
- Provisions `Node.js 20 LTS` and `npm` if missing or outdated.
- Installs `openchamber` globally via npm if not yet installed.
- Executes the clean-from-scratch install, build, and OpenChamber registration.
- Verifies system health.

---

### Method 3: Desktop UI Installation (Manual Method)

If using the OpenChamber desktop graphical interface:
1. In OpenChamber desktop, open **Settings → Extensions**.
2. Click **Add Extension** (or **Install via Git URL**).
3. Paste repository URL:
   ```text
   https://github.com/common-shared/openchamber-rds-mission-control.git
   ```
4. Confirm and approve requested capabilities (`files`, `sessions`, `prompt`, `model`, `filesystem`).
5. Mission Control will appear in the right-hand status panel.

---

## Lifecycle Management Commands

| Action | NPM Script | CLI Equivalent | Shell Script | Description |
|---|---|---|---|---|
| **Clean Install** | `npm run install:extension` | `node scripts/installer.mjs install --clean` | `./scripts/install.sh install` | Clean build from scratch, register with OpenChamber, grant capabilities |
| **Clean Update** | `npm run update:extension` | `node scripts/installer.mjs update` | `./scripts/install.sh update` | Pulls upstream (if git), cleans build, recompiles, re-registers, runs doctor |
| **Remove / Uninstall** | `npm run remove:extension` | `node scripts/installer.mjs remove` | `./scripts/install.sh remove` | Safely unregisters extension from OpenChamber configuration |
| **Health Doctor** | `npm run doctor` | `node scripts/installer.mjs doctor` | `./scripts/install.sh doctor` | Comprehensive diagnostic check of Node, daemon, bundle, permissions, and grants |
| **Run / Enable** | — | `node scripts/installer.mjs run` | `./scripts/install.sh run` | Starts OpenChamber daemon or restarts it to reload extension |
| **Release Gate** | `npm run verify:release` | `node scripts/installer.mjs verify-release` | `./scripts/install.sh verify-release` | Strict pre-release verification: clean build, tests, doctor, and RDS validation |

---

## 🔒 Mandatory Strict Rule: Pre-Release Verification Invariant

> **CRITICAL RELEASE POLICY**:
> On **EVERY release**, the clean install, update, and release verification procedure MUST be executed on this repository and server before creating any version tag or publication:
> ```bash
> npm run verify:release
> ```
> **Release Invariant Rules:**
> 1. A release cannot be tagged, merged to `main`, or published if `verify:release` fails.
> 2. The gate enforces:
>    - Clean build from scratch without stale caches.
>    - 100% automated test suite pass (`npm test`).
>    - Combined typecheck, build, and test verification (`npm run check`).
>    - Complete OpenChamber registration, capability grant, and write permission audit (`doctor`).
>    - Central RDS documentation schema compliance validation (`rds validate`).
> 3. Both human engineers and autonomous AI agents MUST execute and verify this procedure on every release.

---

## Development & Building

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build extension web bundle (esbuild)
npm run build

# Run automated tests
npm test

# Run combined validation check
npm run check
```

---

## Documentation & Governance

This repository is governed by the **Repository Document Standard (RDS v0.8.6)**:
- System Architecture: `docs/architecture/extension-architecture.md`
- Decision Records: `docs/decisions/` (ADR 0001, ADR 0002)
- Operational Runbooks: `docs/operations/extension-operations.md`
- Installation Guide: `docs/operations/installation-and-lifecycle-guide.md`
- Technical Specifications: `docs/specifications/steering-protocol-specification.md`

Validate documentation anytime via:
```bash
/home/pbruser/.local/venvs/eval-harness/bin/python /home/pbruser/workspace/repos/common/rds/scripts/rds.py validate
```

---

## License

MIT
