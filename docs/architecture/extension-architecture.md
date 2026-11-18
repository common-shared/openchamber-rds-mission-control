---
title: "OpenChamber RDS Mission Control Desktop Extension Architecture"
type: "architecture"
status: "active"
created: "2026-11-18"
updated: "2026-11-18"
owner: "OpenChamber Platform Operations / Mission Control Team"
version: "1.0.0"
---

# OpenChamber RDS Mission Control Desktop Extension Architecture

**Repository:** `common-shared/openchamber-rds-mission-control`  
**Standard:** Repository Document Standard (RDS v0.8.5)  
**Status:** Canonical Single Source of Truth (SSOT)  

---

## 1. Executive Summary & Purpose

The **RDS Mission Control** desktop extension (`openchamber-rds-mission-control`) provides a unified graphical heads-up display (HUD), steerable runtime transmission, and intelligent session launcher for AI coding agents operating across the 18 repositories in the workspace estate.

Prior to Mission Control, operators lacked a real-time visual interface to inspect agent cognitive states (`M0_EXPLORE` to `M5_SENSITIVE`), verify task blast radius (`T0_INFORMATIONAL` to `T5_OPERATIONAL_SENSITIVE`), or dynamically modulate autonomy levels without breaking active tool execution.

Mission Control solves this by delivering a lightweight, decoupled web-based status panel inside OpenChamber desktop that coordinates seamlessly with the central RDS enforcer plugin (`rds-enforcer.js`).

---

## 2. Architectural Boundaries & Domain Separation

The RDS ecosystem strictly separates responsibilities into three distinct authorities:

```text
+---------------------------------------------------------------------------------------+
|                                    WORKSPACE ESTATE                                    |
+-----------------------------------+---------------------------------------------------+
| 1. Central Normative Standard     | 2. Mission Control Extension (This Repo)          |
|    (common/rds)                   |    (common/openchamber-rds-mission-control)       |
+-----------------------------------+---------------------------------------------------+
| • Canonical schemas & registry    | • Desktop status panel (DOM / HTML / TypeScript)  |
| • Policy checks & linter CLI      | • Interactive HUD (telemetry rendering)           |
| • Enforcement plugin logic        | • 2-phase turn boundary steering state store      |
| • Submodule distribution source   | • Session draft presets & OmniRoute model routing |
+-----------------------------------+---------------------------------------------------+
```

By decoupling Mission Control into its own repository:
1. **Single Source of Truth (SSOT):** All extension UI code, status sections, DOM controls, build configs, and extension-specific runbooks live exclusively within this repository.
2. **Zero Core Coupling:** The core RDS normative standard (`common/rds`) remains lean, portable, and free of browser/extension DOM dependencies.
3. **Independent Lifecycle:** Extension UI improvements, styling refinements, and telemetry widgets can be updated and released without triggering fleet-wide RDS submodule pointer bumps.

---

## 3. Extension Layout & Section Design

The extension contributes an OpenChamber desktop status section (`statusSection` in `package.json`) structured into three distinct ergonomic sections:

```text
+-----------------------------------------------------------------------------------+
|                        RDS MISSION CONTROL STATUS SECTION                         |
+-----------------------------------------------------------------------------------+
|  SECTION 1: LIVE TELEMETRY & MISSION MONITOR                                      |
|  [ Cognitive Phase: M3_EXECUTE ]  [ Impact: T2_SMALL_CHANGE ]  [ Gear: 3 ]        |
|  Progress: [████████████████████░░░░] 75% (3/4 actions done)                      |
|  Active Workers: 2 / 4 Concurrency Ceiling                                        |
+-----------------------------------------------------------------------------------+
|  SECTION 2: TWO-PHASE TURN-BOUNDARY STEERING                                      |
|  Gear Transmission Selector:  (1: Assist)  (2: Staged)  [3: Supervised]  (4: Head) |
|  Parallel Worker Ceiling:     [---●------] 2 / 4                                  |
|  Staged Changes: None (or "PENDING_NEXT_TURN: Gear 1")                            |
+-----------------------------------------------------------------------------------+
|  SECTION 3: INTELLIGENT SESSION LAUNCHER                                          |
|  [ 🔍 Explore (M0) ]  [ 📝 Propose (M1) ]  [ 📋 Stage (M2) ]  [ ⚡ Execute (M3) ]   |
|  [ 🛡️ Audit (M4) ]   [ 🔐 Sensitive (M5) ]                                        |
|  Default Preset Model: pff-deep-auto / pff-vision-auto                            |
+-----------------------------------------------------------------------------------+
```

### 3.1 Section 1: Live Telemetry & Mission Monitor
- Inspects active session telemetry via OpenChamber SDK file and session hooks.
- Renders active Cognitive Phase (`M0` through `M5`) with color-coded status badges.
- Displays current Task Impact Class (`T0` through `T5`) to indicate repository blast radius.
- Shows current active Gear (1 to 4) and live concurrency level.

### 3.2 Section 2: Turn-Boundary Steering & Runtime Configuration
- Provides interactive sliders and buttons for the human operator to modulate autonomy.
- Implements the strict two-phase atomic configuration handshake:
  - Phase 1: User click writes staged parameters to `.openchamber/rds-mission-control/<sessionId>.json` with status `PENDING_NEXT_TURN`.
  - Phase 2: Agent acknowledges at the start of the next turn (`turn:start`), applies the new configuration, and echoes an Operator Decision Record in chat.
- Guarantees zero disruption to in-flight tools, uncommitted worktrees, or half-written files.

### 3.3 Section 3: Intelligent Session Launcher
- Provides one-click presets for common agent workflow archetypes (M0 Explore, M1 Propose, M2 Stage, M3 Execute, M4 Audit, M5 Sensitive).
- Pre-fills the OpenChamber desktop composer with standard RDS-compliant prompts and sets optimal model routing (`omniroute/pff-deep-auto` for deep logic, `omniroute/pff-vision-auto` for chart/vision tasks).
- Never auto-dispatches without operator confirmation: drafts are loaded into the composer for review.

---

## 4. Build Pipeline & Technical Stack

- **Runtime:** OpenChamber Desktop Extension API (`@openchamber/sdk` >= 2.3.0).
- **Language:** TypeScript 5.7+ targeting ES2022.
- **Bundler:** `esbuild` for fast compilation into a standalone browser bundle (`status/main.js`).
- **Storage:** Local session JSON files stored in `.openchamber/rds-mission-control/${sessionId}.json`.
- **Quality Gates:** `tsc --noEmit` and `node scripts/build.mjs` executed before release.
