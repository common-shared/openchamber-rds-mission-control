---
title: "OpenChamber RDS Mission Control Installation and Lifecycle Management Guide"
type: "operations"
status: "active"
created: "2026-11-22"
updated: "2026-11-22"
owner: "OpenChamber Platform Operations / Mission Control Team"
version: "1.0.0"
---

# OpenChamber RDS Mission Control Installation and Lifecycle Management Guide

**Document ID:** `OP-OCMC-002`  
**Standard:** Repository Document Standard (RDS v0.8.6)  
**Target Audience:** DevOps Engineers, Platform Operators, AI Coding Agents  

---

## 1. Architectural Principles

The installation and lifecycle management subsystem for `openchamber-rds-mission-control` is built on four core principles:

1. **Clean-from-Scratch Invariant**: Every installation or update purges previous transient build artifacts (`status/main.js`) and compiles fresh bundles from source. This prevents phantom bugs caused by stale JavaScript or mismatching type signatures.
2. **Deterministic OpenChamber Reconciliation**: The installer directly and atomically reconciles OpenChamber's extension database (`~/.config/openchamber/extensions.json`), ensuring that extension paths, capabilities (`prompt`, `sessions`, `files`, `model`, `filesystem`), and scopes are explicitly granted.
3. **Parity Between Humans and AI Agents**: Maintenance commands (`install`, `update`, `remove`, `doctor`, `run`, `verify-release`) share identical CLI and npm interfaces, allowing automated agent workflows and human operators to use the exact same mechanisms.
4. **Mandatory Release Verification Gate**: Prior to tagging or publishing any release, the clean install, build, test, and documentation validation pipeline must be executed against the host.

---

## 2. Prerequisites & Compatibility Matrix

| Dependency | Minimum Version | Recommended | Purpose |
|---|---|---|---|
| **Linux OS** | Kernel 5.4+ | Ubuntu 22.04+, Debian 12+, RHEL 9+, Fedora 39+, Arch | Host operating system |
| **Node.js** | `>= 20.0.0` | `20.x LTS` or `22.x LTS` | Runtime environment & build tools |
| **npm** | `>= 10.0.0` | `10.8.0+` | Package manager |
| **OpenChamber** | `>= 2.3.0` | `Latest` (`npm install -g openchamber`) | Desktop/web interface and extension host |
| **Git** | `>= 2.30.0` | `Latest` | Version control & submodule tracking |

---

## 3. Installation Scenarios

### Scenario A: Local Development / Workstation (Direct Link)
When developing or running directly from the repository checkout:
```bash
cd /home/pbruser/workspace/repos/common/openchamber-rds-mission-control

# Execute clean install from scratch
npm run install:extension

# Or using the installer CLI directly
node scripts/installer.mjs install --clean
```

### Scenario B: Dedicated Extension Installation (Standard Client)
To install the extension into OpenChamber's standard extension directory (`~/.config/openchamber/extensions/rds-mission-control`):
```bash
git clone https://github.com/common-shared/openchamber-rds-mission-control.git ~/.config/openchamber/extensions/rds-mission-control
cd ~/.config/openchamber/extensions/rds-mission-control
./scripts/install.sh install
```

### Scenario C: Raw Headless Linux Server
On a newly provisioned Linux server where Node.js, git, or OpenChamber might not yet be installed:
```bash
# Clone the repository
git clone https://github.com/common-shared/openchamber-rds-mission-control.git
cd openchamber-rds-mission-control

# Run universal bash installer with automated dependency provisioning
./scripts/install.sh install
```
The script detects the distribution package manager (`apt`, `dnf`, `pacman`, `zypper`), provisions missing prerequisites, installs the OpenChamber CLI if absent, builds the production bundle, and configures OpenChamber.

---

## 4. Lifecycle Commands Reference

### 4.1 `install`
- **Purpose**: Clean install from scratch, bundle compilation, and registration.
- **Flags**:
  - `--clean`: Purges `status/main.js` and reinstalls dependencies.
  - `--target <dir>`: Sets custom installation directory.
  - `--no-restart`: Disables auto-restarting running OpenChamber daemon.
  - `--quiet`: Suppresses non-error logging.
- **Usage**:
  ```bash
  npm run install:extension
  # Or: node scripts/installer.mjs install --clean
  # Or: ./scripts/install.sh install
  ```

### 4.2 `update`
- **Purpose**: Clean-from-scratch update pulling upstream changes.
- **Flags**:
  - `--no-pull`: Skips `git pull` (useful when updating local modifications).
  - `--no-restart`: Disables auto-restarting OpenChamber daemon.
- **Usage**:
  ```bash
  npm run update:extension
  # Or: node scripts/installer.mjs update
  # Or: ./scripts/install.sh update
  ```

### 4.3 `remove` / `uninstall`
- **Purpose**: Unregisters extension from OpenChamber configuration.
- **Flags**:
  - `--purge`: Removes the session telemetry data directory (`~/.openchamber/rds-mission-control/`).
  - `--prune-capabilities`: Removes capability grants and scopes from `extensions.json`.
  - `--no-restart`: Disables auto-restarting OpenChamber daemon.
- **Usage**:
  ```bash
  npm run remove:extension
  # Or: node scripts/installer.mjs remove
  # Or: ./scripts/install.sh remove
  ```

### 4.4 `doctor` / `status`
- **Purpose**: Runs comprehensive diagnostic health check.
- **Evaluates**:
  1. Node.js version `>= 20.0.0`.
  2. npm availability and version.
  3. OpenChamber CLI binary presence.
  4. OpenChamber daemon process state.
  5. Built assets existence and size (`status/main.js`, `status/index.html`).
  6. `extensions.json` registration path.
  7. Required capability grants (`prompt`, `sessions`, `files`, `model`, `filesystem`).
  8. Filesystem scopes (`/tmp/opencode/**`, `~/.openchamber/**`).
  9. Telemetry storage write permissions.
- **Usage**:
  ```bash
  npm run doctor
  # Or: node scripts/installer.mjs doctor
  # Or: ./scripts/install.sh doctor
  ```

### 4.5 `run` / `enable`
- **Purpose**: Starts or restarts the OpenChamber server daemon with Mission Control enabled.
- **Usage**:
  ```bash
  node scripts/installer.mjs run
  # Or: ./scripts/install.sh run
  ```

### 4.6 `verify-release`
- **Purpose**: Mandatory release verification gate.
- **Enforces**:
  1. Clean build from scratch.
  2. Unit and integration tests pass (`npm test`).
  3. Full validation check (`npm run check`).
  4. Doctor health diagnostics pass.
  5. Central RDS documentation validation passes (`rds validate`).
- **Usage**:
  ```bash
  npm run verify:release
  # Or: node scripts/installer.mjs verify-release
  # Or: ./scripts/install.sh verify-release
  ```

---

## 5. Troubleshooting & FAQ

### Issue: Extension does not appear in OpenChamber panel
1. Run `npm run doctor` to diagnose configuration gaps.
2. Verify that `extensions.json` contains the absolute path to this repo.
3. Restart OpenChamber: `openchamber restart`.

### Issue: Permission denied reading session steering files
1. Verify capability grants in `~/.config/openchamber/extensions.json`:
   - `files` capability must be granted.
   - `filesystem` capability must include scope `~/.openchamber/**`.
2. Run `npm run install:extension` to automatically reconcile grants and scopes.
