# openchamber-rds-mission-control

The canonical repository and Single Source of Truth (SSOT) for the **RDS Mission Control** desktop extension for OpenChamber.

## Capabilities & Scope
- **Section 1: Live Telemetry & Mission Monitor**: Real-time HUD displaying Cognitive Mode (`M0_EXPLORE` .. `M5_SENSITIVE`), Impact Class (`T0_INFORMATIONAL` .. `T5_OPERATIONAL_SENSITIVE`), 4-Gear Autonomy Transmission indicator, and parallel execution gauge.
- **Section 2: Turn-Boundary Steering & Runtime Configuration**: Staged adjustments to Gear (1 to 4) and parallelism ceiling via atomic handshake (`PENDING_NEXT_TURN` in `.openchamber/rds-mission-control/<sessionId>.json`) safely activated at turn boundaries.
- **Section 3: Intelligent Session Launcher**: Pre-fills RDS-compliant session draft templates with optimal OmniRoute model presets (`pff-deep-auto`, `pff-vision-auto`) into the OpenChamber desktop composer.

## Governance & Repository Document Standard (RDS)
This repository is enrolled in the Repository Document Standard (RDS) at version 0.8.5.
All sessions are governed by the central standard at `common/rds`.
- **Precedence Hierarchy:** Level 0 (Hard Safety) > Level 1 (Central RDS) > Level 2 (Global OpenCode) > Level 3 (Repo Contract) > Level 4 (Prompt).
- **Domain Separation:** Enduring knowledge resides in `docs/`, pre-implementation specs in `openspec/`, and ephemeral agent execution state in `.planning/`.
- **Validation:** Run `rds validate` or `/home/pbruser/.local/venvs/eval-harness/bin/python /home/pbruser/workspace/repos/common/rds/scripts/rds.py validate` before committing documentation changes.
- **Worktree-Isolated Lifecycle:** Never commit directly on `dev` or `main`. All tasks must run in dedicated isolated worktrees and be merged into `dev`, tested, and pushed immediately to `origin`.

## Repository Configuration
- **Main Branch:** `main`
- **Integration Branch:** `dev`
- **Submodule:** `.claude/skills/repository-documentation` (pinned to authoritative central RDS release)
- **Documentation Standard:** `docs/architecture/`, `docs/operations/`, `docs/specifications/`, `docs/decisions/`
