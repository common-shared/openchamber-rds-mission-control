---
title: "OpenChamber RDS Mission Control Operational Runbook"
type: "operations"
status: "active"
created: "2026-11-18"
updated: "2026-11-22"
owner: "OpenChamber Platform Operations / Mission Control Team"
version: "1.2.0"
---

# OpenChamber RDS Mission Control Operational Runbook

**Runbook ID:** `OP-OCMC-001`  
**Standard:** Repository Document Standard (RDS v0.8.6)  
**Target Audience:** Platform Engineers, OpenChamber Developers, Extension Users  

---

## 1. Overview & Installation

The **RDS Mission Control** extension integrates into OpenChamber as an installable extension. It provides automated, clean-from-scratch installation mechanisms for both desktop users and headless/raw Linux server environments.

### 1.1 Automated Clean-from-Scratch CLI Installation (Recommended)
From the repository root on any configured workstation or server:
```bash
# Clean install from scratch, build production bundle, and register with OpenChamber:
npm run install:extension

# Or directly via installer CLI:
node scripts/installer.mjs install --clean

# Or via universal bash installer:
./scripts/install.sh install
```
This automated process:
1. Wipes stale bundle assets (`status/main.js`) and cleans previous build artifacts.
2. Ensures all dependencies are cleanly installed and passes TypeScript typechecks.
3. Compiles the production browser bundle using esbuild.
4. Atomically registers the extension in `~/.config/openchamber/extensions.json` (or `$OPENCHAMBER_DATA_DIR/extensions.json`).
5. Configures required capability grants: `prompt`, `sessions`, `files`, `model`, `filesystem`.
6. Configures required capability scopes: `filesystem: ["/tmp/opencode/**", "~/.openchamber/**"]`.
7. Ensures telemetry and session steering directory exists (`~/.openchamber/rds-mission-control/`).
8. Restarts the running OpenChamber daemon (if active) to immediately load the extension.
9. Executes post-install doctor diagnostics.

### 1.2 Raw Linux Server Installation
For raw or fresh Linux servers (Ubuntu/Debian, Fedora/RHEL, Arch, openSUSE):
```bash
# Clone and run the universal installer:
git clone https://github.com/common-shared/openchamber-rds-mission-control.git
cd openchamber-rds-mission-control
./scripts/install.sh install
```
The script automatically:
- Detects the Linux distribution via `/etc/os-release`.
- Provisions Node.js 20 LTS, npm, and git if missing.
- Installs the OpenChamber CLI globally via npm if not present.
- Executes the clean-from-scratch installation and registration.

### 1.3 Desktop UI Installation (Optional Manual Method)
1. In OpenChamber desktop, open **Settings → Extensions**.
2. Click **Add Extension** (or **Install via Git URL**).
3. Provide the canonical repository Git URL:
   ```text
   https://github.com/common-shared/openchamber-rds-mission-control.git
   ```
4. Approve the requested extension capabilities (`prompt`, `sessions`, `files`, `model`, `filesystem`).
5. The extension panel renders in the active workspace status bar with compact tabbed ergonomics (~150px–175px).

---

## 2. Day-to-Day Operations & Steering Workflows

### 2.1 Tabbed Navigation & Real-Time Monitoring
The extension is partitioned into three ergonomic tabs:
- **`📡 Monitor`**: Live HUD displaying Cognitive Phase (`M0`..`M5`), Impact Class (`T0`..`T5`), Gear (1..4), active Git branch/worktree, token context usage, live tool execution (`⚡ edit ...`), and focus action progress bar.
- **`⚙️ Steering`**: Modulate autonomy settings, stage phase redirects, adjust parallel worker concurrency, or trigger emergency holds.
- **`🚀 Launch`**: One-click prompt staging for all 6 cognitive archetypes and quick operational presets.

Click the **`[🔄]` Refresh** button in the header at any time to force an immediate disk and SDK telemetry resynchronization.

### 2.2 Modulating Agent Autonomy (Steering Handshake)
By default, sessions run in **`🤖 AUTO`** mode where the coding agent determines its own Triad Inception state. When you need to intervene:
1. In the **`⚙️ Steering`** tab, select the desired **Gear** (e.g., `Gear 1: Manual Step`), **Impact**, or **Phase Redirect**.
2. Alternatively, click **`🛑 Hold`** to instantly intercept and stage Gear 1.
3. Click **`Stage for Next Turn`**. The UI stages the change as `PENDING_NEXT_TURN`.
4. The running agent finishes its current atomic tool execution safely.
5. At the next turn boundary, the agent adopts the staged configuration and logs an Operator Decision Record.
6. To return to autonomous agent decisions, click **`↩️ Auto`**.

### 2.3 Launching Staged Sessions
To start a new task cleanly:
1. Switch to the **`🚀 Launch`** tab.
2. Select the desired workflow archetype (e.g., **`🧠 M0_EXPLORE`**, **`📋 M2_STAGE`**, **`⚡ M3_EXECUTE`**, **`🔐 M5_SENSITIVE`**) or a quick preset like **`🛠️ T2 Bugfix`**.
3. Mission Control pre-fills the composer with a structured prompt draft and configures model routing.
4. Review and adjust the prompt text before pressing Enter to launch.

---

## 3. Maintenance, Building & Testing

### 3.1 Local Development Cycle
To modify or test the extension locally:
```bash
# Clean install dependencies
npm install

# Run type checking
npm run typecheck

# Build bundle
npm run build

# Run combined validation check (typecheck, build, test)
npm run check
```

### 3.2 Documentation Validation
As an enrolled RDS consumer repository, validate enduring documentation using the centralized RDS toolchain:
```bash
/home/pbruser/.local/venvs/eval-harness/bin/python /home/pbruser/workspace/repos/common/rds/scripts/rds.py validate
```

---

## 4. Lifecycle Management & Health Diagnostics

### 4.1 Diagnostic Health Doctor
To verify the host environment, OpenChamber binary, daemon status, bundle freshness, and configuration grants:
```bash
npm run doctor
# Or: node scripts/installer.mjs doctor
# Or: ./scripts/install.sh doctor
```
The doctor evaluates:
- Node.js runtime (>= 20.0.0)
- npm package manager availability
- OpenChamber CLI binary and daemon process status
- Extension bundle size and timestamps (`status/main.js`, `status/index.html`)
- OpenChamber `extensions.json` registration
- Capability grants (`prompt`, `sessions`, `files`, `model`, `filesystem`)
- Capability scopes (`/tmp/opencode/**`, `~/.openchamber/**`)
- Telemetry storage write permissions (`~/.openchamber/rds-mission-control/`)

### 4.2 Clean Update from Scratch
To update the extension while eliminating stale state:
```bash
npm run update:extension
# Or: ./scripts/install.sh update
```
This routine pulls upstream changes (if on a git branch), cleans stale bundles, rebuilds from scratch, re-reconciles configuration, restarts the daemon, and runs the health doctor.

### 4.3 Extension Uninstallation & Removal
To cleanly unregister the extension from OpenChamber:
```bash
npm run remove:extension
# Or: ./scripts/install.sh remove

# To also purge historical session telemetry data:
node scripts/installer.mjs remove --purge
```

---

## 5. Mandatory Release Verification Invariant

On every release, the clean installation, build, and verification procedure MUST be executed on this repository and server before any release tag or publication.

### 5.1 Verification Command
```bash
npm run verify:release
# Or: node scripts/installer.mjs verify-release
# Or: ./scripts/install.sh verify-release
```

### 5.2 Release Gate Protocol
The release verification gate enforces a strict 5-step pipeline:
1. **Clean Build from Scratch**: Purges stale build outputs and re-compiles bundle via esbuild.
2. **Automated Unit Tests**: Runs all unit and integration suites (`npm test`).
3. **Full Validation Check**: Executes typechecks, build, and test suites (`npm run check`).
4. **Doctor Health Audit**: Audits Node version, OpenChamber registration, capabilities, and write permissions.
5. **Central RDS Validation**: Validates all enduring documentation against canonical schemas (`rds validate`).

A release tag or publication is strictly blocked if any check produces a failure.

