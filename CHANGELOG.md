# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-18

### Added
- Initial standalone release of **RDS Mission Control** OpenChamber desktop extension.
- **Section 1 (Live Telemetry & Mission Monitor):** Real-time monitoring HUD for active Cognitive Phase (`M0`..`M5`), Task Impact Class (`T0`..`T5`), 4-Gear transmission, and active worker count.
- **Section 2 (Turn-Boundary Steering):** Safe runtime steering controls for Gear (1 to 4) and concurrency ceiling with two-phase atomic handshake (`PENDING_NEXT_TURN`).
- **Section 3 (Intelligent Session Launcher):** Pre-fills standard RDS session draft templates and optimal OmniRoute model presets (`pff-deep-auto` and `pff-vision-auto`) into composer.
- Enrolled in Repository Document Standard (RDS v0.8.5) via submodule `.claude/skills/repository-documentation`.
- Added canonical enduring documentation: Architecture, Operations runbook, Steering protocol specification, and ADR 0001.
