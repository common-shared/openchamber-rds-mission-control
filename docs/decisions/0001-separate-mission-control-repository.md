---
title: "ADR 0001: Separation of OpenChamber Mission Control as Independent SSOT Repository"
type: "decisions"
status: "accepted"
created: "2026-11-18"
owner: "OpenChamber Platform Operations / Mission Control Team"
---

# ADR 0001: Separation of OpenChamber Mission Control as Independent SSOT Repository

## Context & Problem Statement
The RDS ecosystem initially developed the OpenChamber desktop extension files alongside the central standard. However, mixing desktop UI extension code (HTML/TypeScript/DOM/esbuild) with central normative schemas, validators, and estate-wide policy specifications caused:
1. Architectural ambiguity regarding the Single Source of Truth (SSOT).
2. Unnecessary coupling where UI changes in Mission Control risked altering central RDS versions.
3. Violation of consumer fleet isolation standards.

## Decision
We establish `common-shared/openchamber-rds-mission-control` as the dedicated, independent repository and canonical SSOT for the OpenChamber RDS Mission Control desktop extension.

1. **Submodule Enrollment:** `openchamber-rds-mission-control` adopts `common/rds` as a Git submodule under `.claude/skills/repository-documentation`.
2. **Domain Boundaries:**
   - Central `common/rds`: Normative policy, registry schemas, enforcer plugins, and CLI tools.
   - Extension repo: Desktop UI bundle, DOM status section, store logic, and extension-specific documentation.
3. **No Overlap:** Central RDS references Mission Control as an external client/consumer, eliminating duplicate source and documentation files.

## Consequences & Compliance
- **Positive:** Clear separation of concerns, clean versioning, and zero fleet drift.
- **Positive:** Mission Control can be developed and released using standard web extension tooling (`npm`, `esbuild`, `tsc`) without burdening the central Python/pytest test suites.
- **Compliance:** Enrolled in RDS v0.8.5 with `.rds/config.json` and passes `rds validate`.
