---
title: "OpenChamber RDS Mission Control Operational Runbook"
type: "operations"
status: "active"
created: "2026-11-18"
updated: "2026-11-19"
owner: "OpenChamber Platform Operations / Mission Control Team"
version: "1.1.0"
---

# OpenChamber RDS Mission Control Operational Runbook

**Runbook ID:** `OP-OCMC-001`  
**Standard:** Repository Document Standard (RDS v0.8.5)  
**Target Audience:** Platform Engineers, OpenChamber Developers, Extension Users  

---

## 1. Overview & Installation

The **RDS Mission Control** extension integrates into OpenChamber Desktop as an installable extension.

### 1.1 Installation in OpenChamber Desktop
1. In OpenChamber desktop, open **Settings → Extensions**.
2. Click **Add Extension** (or **Install via Git URL**).
3. Provide the canonical repository Git URL:
   ```text
   https://github.com/common-shared/openchamber-rds-mission-control.git
   ```
4. Approve the requested extension capabilities:
   - `files`: Read/write session steering JSON in `.openchamber/rds-mission-control/`.
   - `sessions`: Query active session status, focus progress, and tool activity.
   - `prompt`: Inject launch templates into composer.
   - `model`: Suggest optimal OmniRoute AI model profile.
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
# Clone the repository
git clone https://github.com/common-shared/openchamber-rds-mission-control.git
cd openchamber-rds-mission-control

# Install dependencies
npm install

# Run type checking
npm run typecheck

# Build bundle
npm run build

# Run combined validation check
npm run check
```

### 3.2 Documentation Validation
As an enrolled RDS consumer repository, validate enduring documentation using the centralized RDS toolchain:
```bash
python .claude/skills/repository-documentation/scripts/rds.py validate
```
