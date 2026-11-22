# Technical Specification: Installation, Lifecycle & Release Verification Protocol

## 1. Specification Identifier
- **Spec ID:** `SPEC-OCMC-LIFECYCLE-001`
- **Target Standard:** RDS v0.8.6 & OpenChamber v2.3+ Extension Specification
- **Component:** `openchamber-rds-mission-control`

## 2. Directory Layout & Paths
The system recognizes two standard installation archetypes:
1. **SSOT Repository Direct Link (Development & Platform Workstations)**:
   - Path: `/home/<user>/workspace/repos/common/openchamber-rds-mission-control`
   - Registered in: `~/.config/openchamber/extensions.json`
2. **Canonical Extension Destination (Production / Server Deployments)**:
   - Path: `~/.config/openchamber/extensions/rds-mission-control`
   - Cloned from: `https://github.com/common-shared/openchamber-rds-mission-control.git`

## 3. Configuration Contract (`extensions.json`)
OpenChamber configures extensions at `~/.config/openchamber/extensions.json` (or `$OPENCHAMBER_DATA_DIR/extensions.json`). The installer MUST enforce the following schema contract:

```json
{
  "paths": [
    "<resolved_extension_path>"
  ],
  "capabilityGrants": {
    "rds-mission-control": [
      "prompt",
      "sessions",
      "files",
      "model",
      "filesystem"
    ]
  },
  "capabilityScopes": {
    "rds-mission-control": {
      "filesystem": [
        "/tmp/opencode/**",
        "~/.openchamber/**"
      ]
    }
  },
  "storageIds": {
    "rds-mission-control": "d4abd8c2-4af9-47c0-9857-7cb202effc7e"
  }
}
```

## 4. Lifecycle Commands & States

| Command | Action | Clean Scratch Behavior | Expected Exit Code |
|---|---|---|---|
| `install` | Installs dependencies, builds bundle, registers in `extensions.json`, initializes data directories | Removes stale `status/main.js`, runs fresh build | 0 on success, 1 on failure |
| `update` | Pulls upstream (if git), rebuilds bundle, reconciles config | Rebuilds bundle cleanly from source | 0 on success, 1 on failure |
| `remove` | Unregisters from `extensions.json`, prunes grants | Preserves user session history unless `--purge` | 0 on success, 1 on failure |
| `doctor` | Validates host runtime, build artifacts, permissions, test suite | Non-destructive verification | 0 if healthy, 1 if degraded |
| `verify-release` | Clean-from-scratch install, check suite, doc validation | Re-installs and runs `npm run check` + `rds validate` | 0 on PASS, 1 on FAIL |

## 5. Raw Linux Prerequisites Contract
When executing on a raw Linux host:
1. **OS Detection**: `/etc/os-release` (Debian/Ubuntu `apt`, RHEL/Fedora `dnf`, Arch `pacman`, SUSE `zypper`).
2. **Node.js Environment**: Node.js >= 20.0.0 and npm >= 10.0.0.
3. **OpenChamber Host**: `openchamber` CLI binary available in PATH, or installed via `npm install -g openchamber`.
4. **Daemon Lifecycle**: Supports managing OpenChamber via `openchamber restart` or systemd user service `openchamber.service`.

## 6. Release Verification Invariant
Before any version tag or release publication:
1. `node scripts/installer.mjs verify-release` MUST execute with zero errors.
2. The check executes a complete clean-from-scratch build, unit tests, integration health checks, and central RDS validation.
3. Any failure immediately blocks release publication.
