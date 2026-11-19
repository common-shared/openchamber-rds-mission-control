# RDS Mission Control for OpenChamber

An OpenChamber desktop status section and control panel providing real-time telemetry, live steerable autonomy, dynamic configuration, and intelligent session launching for the **Repository Document Standard (RDS)** ecosystem.

---

## Capabilities

1. **📡 Tab 1: Live Telemetry & Mission Monitor**
   - Active Cognitive Mode (`M0_EXPLORE` .. `M5_SENSITIVE`)
   - Task Impact Class (`T0_INFORMATIONAL` .. `T5_OPERATIONAL_SENSITIVE`)
   - 4-Gear Autonomy Transmission indicator (`Gear 1` .. `Gear 4` + `[AUTO]`/`[MANUAL]`)
   - RDS Governance enrollment badge (`ENFORCED`, `WARNINGS`, `DEGRADED`, `UNMANAGED`)
   - Active Git branch and worktree isolation guard (`feat/... 🌿` vs `dev ⚠️`)
   - Real-time token context window meter (`used / limit`)
   - Live tool execution indicator (`⚡ edit ...`) and focus actions progress bar
   - Instant manual refresh button `[🔄]` with visual spin feedback and animated `[🟢 LIVE]` heartbeat

2. **⚙️ Tab 2: Safe Turn-Boundary Steering & Runtime Configuration**
   - **Auto-by-Default:** Sessions initialize in `🤖 AUTO` mode where the coding agent determines its own Triad Inception state
   - Manual overrides stage an explicit `👤 MANUAL OVERRIDE` with one-click `↩️ Auto` restore
   - Live Gear selector (1 to 4) and Cognitive Phase redirect
   - Concurrency modulation with no-overflow Worker Steppers (`[-] [ 4 ] [+]`)
   - Emergency Hold button (`🛑 Hold`) to immediately intercept and drop autonomy to Gear 1
   - Safe Atomic Handshake: staged adjustments display as `PENDING_NEXT_TURN` in `.openchamber/rds-mission-control/<sessionId>.json` and cleanly activate at the next safe turn boundary without disrupting active execution

3. **🚀 Tab 3: Intelligent Session Launcher**
   - Complete 6-phase cognitive archetype launchers (`M0_EXPLORE` through `M5_SENSITIVE`)
   - Quick operational task presets (`🛠️ T2 Bugfix`, `🧪 Nyquist Tests`, `🩺 RDS Doctor`, `📦 As-Built Wrapup`)
   - Pre-fills RDS-compliant session draft templates and optimal OmniRoute AI models (`pff-deep-auto` for deep logic, `pff-vision-auto` for multimodal)
   - Opens the composer in OpenChamber desktop without auto-starting, allowing review before dispatch

4. **🪟 Ergonomic Tabbed Interface & Dynamic Height**
   - Segmented navigation tabs (`Monitor`, `Steering`, `Launch`)
   - Measures content and calls `host.setHeight(height)` dynamically, reducing vertical sidebar height from 400px down to ~150–175px to eliminate panel crowding
   - Strict per-session cache isolation keyed by `sessionId` with an active session ID chip (`#ses_...`)

---

## Installation in OpenChamber Desktop

1. In OpenChamber desktop, open **Settings → Extensions**.
2. Click **Add Extension** (or **Install via Git URL**).
3. Paste the repository URL:
   ```text
   https://github.com/common-shared/openchamber-rds-mission-control.git
   ```
4. Confirm and approve requested capabilities (`files`, `sessions`, `prompt`, `model`).
5. The **RDS Mission Control** section will appear in the right-hand panel of your active workspace!

---

## Development & Building

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build extension web bundle (esbuild)
npm run build
```

---

## License

MIT
