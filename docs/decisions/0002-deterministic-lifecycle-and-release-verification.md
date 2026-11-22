---
title: "ADR 0002: Deterministic Lifecycle Management and Mandatory Release Verification Invariant"
type: "decisions"
status: "accepted"
created: "2026-11-22"
owner: "OpenChamber Platform Operations / Mission Control Team"
---

# ADR 0002: Deterministic Lifecycle Management and Mandatory Release Verification Invariant

## Context & Problem Statement
The `openchamber-rds-mission-control` desktop extension operates inside OpenChamber across diverse deployment topologies, including local developer workstations, staging systems, and raw headless Linux servers. 

Previously, extension installation relied on manual Git URL registration inside the OpenChamber desktop UI or ad-hoc file linking. This caused several operational challenges:
1. **Stale Asset Drift:** When switching branches or updating, cached or previously built `status/main.js` bundles could persist without re-compilation, leading to subtle runtime bugs.
2. **Missing Configuration Reconciliation:** Manually registering extensions could omit required OpenChamber capability grants (`prompt`, `sessions`, `files`, `model`, `filesystem`) or capability scopes (`/tmp/opencode/**`, `~/.openchamber/**`), causing permission errors during session launch or steering.
3. **Lack of Headless / Server Support:** Raw Linux servers lacking desktop UI access had no automated CLI mechanism to install, configure, verify, or remove the extension.
4. **Unverified Release Risk:** Tagging or releasing code without running a live clean installation and health verification on the host could result in broken releases.

## Decision
We implement a comprehensive, deterministic lifecycle management system with an automated installer CLI and establish a mandatory release verification gate:

1. **Deterministic Lifecycle Engine (`scripts/installer.mjs` & `bin/mission-control.mjs`)**:
   - Implements atomic commands: `install`, `update`, `remove`, `doctor`, `run`, and `verify-release`.
   - Always executes **clean-from-scratch** builds by removing stale bundles, running TypeScript typechecks, and re-compiling production bundles via esbuild.
   - Automatically manages `~/.config/openchamber/extensions.json`, guaranteeing accurate `paths`, capability grants, filesystem scopes, and deterministic storage IDs.
   - Provides a comprehensive diagnostic doctor (`doctor`) verifying Node.js >= 20, npm, OpenChamber binary, daemon status, bundle freshness, permissions, and test suites.

2. **Universal Raw Linux Shell Installer (`scripts/install.sh`)**:
   - Detects Linux distribution via `/etc/os-release` and provisions required prerequisites (git, curl, Node.js 20 LTS, OpenChamber CLI).
   - Supports automated installation on workstations and servers with human- and AI-friendly diagnostic logging.

3. **Mandatory Release Verification Invariant**:
   - Enforces the strict rule: On every release, `npm run verify:release` (or `node scripts/installer.mjs verify-release`) MUST execute cleanly on the repository and server before any release tag or publication.
   - The verification gate executes: clean build from scratch, TypeScript typechecks, automated unit tests, OpenChamber configuration and doctor diagnostics, and central RDS documentation validation (`rds validate`).
   - If any gate fails, the release is strictly blocked.

## Consequences & Compliance
- **Positive:** Deterministic, reproducible installations across any Linux environment.
- **Positive:** Zero chance of publishing broken releases or stale bundles due to automated release gating.
- **Positive:** Full parity between human operators and autonomous AI agents using identical lifecycle commands.
- **Compliance:** Enrolled in RDS v0.8.6; all docs validated via `rds validate`.
