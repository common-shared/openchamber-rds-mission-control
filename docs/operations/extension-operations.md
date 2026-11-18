---
title: "OpenChamber RDS Mission Control Operational Runbook"
type: "operations"
status: "active"
created: "2026-11-18"
updated: "2026-11-18"
owner: "OpenChamber Platform Operations / Mission Control Team"
version: "1.0.0"
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
   - `sessions`: Query active session status and focus cards.
   - `prompt`: Inject launch templates into composer.
   - `model`: Suggest optimal OmniRoute AI model profile.
5. The extension panel will immediately render in the active workspace status bar.

---

## 2. Day-to-Day Operations & Steering Workflows

### 2.1 Modulating Agent Autonomy (Steering Handshake)
When an agent is running with high autonomy (e.g., Gear 3 or Gear 4) and you need to intervene:
1. In Section 2 of the Mission Control panel, click **Gear 1 (Assist)**.
2. The UI will stage the change as `PENDING_NEXT_TURN: Gear 1`.
3. The running agent will finish its current atomic file or tool execution safely.
4. When the agent reaches the next turn boundary (e.g. asking a Question or awaiting user response), it adopts Gear 1 and logs:
   ```text
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ 📋 OPERATOR DECISION RECORD                                             │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ Question:       Runtime Steering Configuration Update                   │
   │ Chosen Option:  Gear 1 (Assist - Manual Step-by-Step)                   │
   │ Action Taken:   Switched execution transmission to Gear 1               │
   └─────────────────────────────────────────────────────────────────────────┘
   ```
5. All subsequent actions require explicit step confirmation.

### 2.2 Launching Staged Sessions
To start a new task cleanly:
1. Navigate to Section 3 of the Mission Control panel.
2. Select the desired workflow archetype (e.g., **M0 Explore** or **M3 Execute**).
3. Mission Control pre-fills the composer with a structured Triad Inception prompt draft and sets the optimal OmniRoute model (`pff-deep-auto` or `pff-vision-auto`).
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
