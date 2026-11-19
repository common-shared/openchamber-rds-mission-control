---
title: "Technical Specification: Mission Control Session Steering Protocol"
type: "specifications"
status: "active"
version: "1.1.0"
created: "2026-11-18"
updated: "2026-11-19"
owner: "OpenChamber Platform Operations / Mission Control Team"
---

# Technical Specification: Mission Control Session Steering Protocol

**Specification ID:** `SPEC-OCMC-001`
**Schema Version:** `1.1.0`
**Governing Standard:** RDS v0.8.5

---

## 1. Storage Location & Schema

Session steering documents are stored on local disk under the workspace repository directory:

```text
.openchamber/rds-mission-control/<sessionId>.json
```

### JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MissionControlSessionSteering",
  "type": "object",
  "required": ["sessionId", "updatedAt", "active"],
  "properties": {
    "sessionId": { "type": "string" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "active": {
      "type": "object",
      "required": ["gear", "concurrency", "mode"],
      "properties": {
        "phase": {
          "type": "string",
          "enum": ["M0_EXPLORE", "M1_PROPOSE", "M2_STAGE", "M3_EXECUTE", "M4_AUDIT", "M5_SENSITIVE"]
        },
        "impact": {
          "type": "string",
          "enum": ["T0_INFORMATIONAL", "T1_READ_ONLY_REPO", "T2_SMALL_CHANGE", "T3_FEATURE_CHANGE", "T4_MULTI_PHASE", "T5_OPERATIONAL_SENSITIVE"]
        },
        "gear": { "type": "integer", "minimum": 1, "maximum": 4 },
        "mode": { "type": "string", "enum": ["AUTO", "MANUAL"] },
        "rdsStatus": { "type": "string", "enum": ["ENFORCED", "ENFORCED_WITH_WARNINGS", "DEGRADED_READ_ONLY", "UNMANAGED_REPOSITORY"] },
        "branch": { "type": "string" },
        "isWorktree": { "type": "boolean" },
        "concurrency": { "type": "integer", "minimum": 1, "maximum": 16 }
      }
    },
    "pending": {
      "type": "object",
      "properties": {
        "status": { "type": "string", "enum": ["PENDING_NEXT_TURN", "APPLIED", "CANCELLED"] },
        "requestedAt": { "type": "integer" },
        "mode": { "type": "string", "enum": ["AUTO", "MANUAL"] },
        "phase": { "type": "string" },
        "impact": { "type": "string" },
        "gear": { "type": "integer", "minimum": 1, "maximum": 4 },
        "concurrency": { "type": "integer", "minimum": 1, "maximum": 16 }
      }
    }
  }
}
```

---

## 2. Handshake State Transitions & Auto-by-Default

Every session initializes in **`AUTO`** mode, allowing the coding agent to autonomously classify the Triad Inception state (Cognitive Phase, Impact Class, Gear). When the operator adjusts controls in Mission Control, a manual override is staged:

```text
               [ Session Start / Inception ]
                             │
                             ▼
                 State: AUTO (Agent Decides)
                             │
            [ Operator overrides in UI / Clicks Hold ]
                             │
                             ▼
                  State: PENDING_NEXT_TURN (MANUAL)
                             │
               [ Agent reaches turn:start ]
                             │
                             ▼
                 State: APPLIED (Manual Override Active)
                             │
               [ Operator clicks Reset to Auto ]
                             │
                             ▼
                 State: AUTO (Autonomous Steering)
```

1. **Write (UI Thread):** Extension stages user adjustment in `pending` block with status `PENDING_NEXT_TURN`.
2. **Read (Agent Hook):** Agent session controller inspects the JSON file on every prompt or question answer.
3. **Commit:** Active configuration updates to match pending settings, and `pending` is cleared or marked `APPLIED`.
