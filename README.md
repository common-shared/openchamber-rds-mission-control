# RDS Mission Control for OpenChamber

An OpenChamber desktop status section and control panel providing real-time telemetry, live steerable autonomy, dynamic configuration, and intelligent session launching for the **Repository Document Standard (RDS)** ecosystem.

---

## Capabilities

1. **📊 Section 1: Live Telemetry & Mission Monitor**
   - Active Cognitive Mode (`M0_EXPLORE` .. `M5_SENSITIVE`)
   - Task Impact Class (`T0_INFORMATIONAL` .. `T5_OPERATIONAL_SENSITIVE`)
   - 4-Gear Autonomy Transmission indicator (Gear 1: Assist .. Gear 4: Headless)
   - Real-time parallel execution gauge & active worker count
   - Dynamic GSD and OpenSpec boundary status

2. **⚙️ Section 2: Safe Turn-Boundary Steering & Configuration**
   - Live Gear selector (1 to 4)
   - Max parallel worker ceiling slider (1 to 4)
   - Safe Atomic Handshake: staged adjustments display as `PENDING_NEXT_TURN` in `.openchamber/rds-mission-control/<sessionId>.json` and cleanly activate at the next safe turn boundary without disrupting active execution.

3. **🚀 Section 3: Intelligent Session Launcher**
   - Pre-fills RDS-compliant session draft templates
   - Pre-selects optimal OmniRoute AI models (`pff-deep-auto` for deep logic, `pff-vision-auto` for multimodal)
   - Opens the composer in OpenChamber desktop without auto-starting, allowing review before dispatch.

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
