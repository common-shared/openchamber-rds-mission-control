# Design Document: Deterministic Lifecycle Management & Release Verification

## Architectural Overview

The lifecycle management engine acts as the authoritative controller for building, installing, configuring, verifying, and removing the OpenChamber RDS Mission Control extension across Linux systems.

```text
+------------------------------------------------------------------------------------+
|                         LIFECYCLE MANAGEMENT ARCHITECTURE                          |
|                                                                                    |
|  +--------------------+        +---------------------+       +------------------+  |
|  |   scripts/install.sh|  --->  | scripts/installer.mjs|  <--  |bin/mission-control|  |
|  | (Raw Linux Host/CI)|        |  (Node CLI & Engine)|       | (npx/npm entry)  |  |
|  +--------------------+        +----------+----------+       +------------------+  |
|                                           |                                        |
|             +-----------------------------+-----------------------------+          |
|             |                             |                             |          |
|             v                             v                             v          |
|    +------------------+          +------------------+          +------------------+|
|    | Build & Package  |          | OpenChamber Host |          | Health & Release ||
|    |  (Clean Scratch) |          | Config & Grants  |          | Verification Gate||
|    +------------------+          +------------------+          +------------------+|
|    | • Clean dist/js  |          | • extensions.json|          | • Unit tests     |  |
|    | • Fresh npm deps |          | • paths array    |          | • Build bundle   |  |
|    | • esbuild bundle |          | • grants: prompt,|          | • Host status    |  |
|    | • status/main.js |          |   files,sessions,|          | • RDS validate   |  |
|    | • ts typecheck   |          |   model, fs      |          | • Live handshake |  |
|    +------------------+          +------------------+          +------------------+|
+------------------------------------------------------------------------------------+
```

## Core Components

1. **`scripts/installer.mjs`**:
   - `install(options)`:
     - Detects installation target (repository directory or cloned destination `~/.config/openchamber/extensions/rds-mission-control`).
     - Performs a clean-from-scratch reset if `--clean` is set (removes old bundle, caches, runs `npm install`).
     - Builds production bundle (`scripts/build.mjs`).
     - Atomically updates OpenChamber's `~/.config/openchamber/extensions.json`:
       - Adds target path to `paths` if not already present.
       - Adds capability grants: `["prompt", "sessions", "files", "model", "filesystem"]`.
       - Adds capability scopes: `filesystem: ["/tmp/opencode/**", "~/.openchamber/**"]`.
       - Ensures deterministic UUID in `storageIds`.
     - Ensures required session steering directory exists: `~/.openchamber/rds-mission-control/`.
     - If OpenChamber daemon is running, can signal restart or status check.
   - `update(options)`:
     - Fetches latest git commits if running inside a git clone.
     - Runs clean build from scratch.
     - Re-verifies `extensions.json` registration and permissions.
     - Runs doctor health check.
   - `remove(options)`:
     - Removes extension path from `extensions.json`.
     - Optionally prunes capability grants and scopes.
     - Backs up or cleans storage if requested.
   - `doctor(options)`:
     - Checks Node.js version (>= 20).
     - Checks OpenChamber executable and runtime status.
     - Validates built assets (`status/main.js`, `status/index.html`, `package.json`).
     - Verifies `extensions.json` contains valid path and capability grants.
     - Verifies writable directories for session focus and mission control steering.
     - Runs test suite.
   - `verifyRelease(options)`:
     - Orchestrates full clean build, full test run (`npm run check`), registration check, and RDS documentation validation (`rds validate`).
     - Exits with code 1 if any check fails, blocking release.

2. **`scripts/install.sh`**:
   - Universal bash wrapper with zero external runtime dependencies beyond bash and curl/wget.
   - Supports `--raw-linux` mode:
     - Detects distro via `/etc/os-release`.
     - Installs curl, git, build-essential if missing (via apt, dnf, pacman, zypper).
     - Installs Node.js 20 LTS via official NodeSource or nvm if missing.
     - Installs OpenChamber CLI globally via npm if missing.
   - Clones repo into destination or builds in place.
   - Runs `node scripts/installer.mjs install --clean`.
   - Starts OpenChamber service or user systemd unit if requested.
   - Output formatted with clear ANSI status banners for human operators and structured logs for AI agents.

3. **`bin/mission-control.mjs`**:
   - Executable Node script routing arguments (`install`, `update`, `remove`, `doctor`, `verify-release`, `help`).
