---
title: "Technical Specification: Mission Control Session Steering Protocol"
type: "specifications"
status: "active"
version: "1.0.0"
created: "2026-11-18"
updated: "2026-11-18"
owner: "OpenChamber Platform Operations / Mission Control Team"
---

# Technical Specification: Mission Control Session Steering Protocol

**Specification ID:** `SPEC-OCMC-001`  
**Schema Version:** `1.0.0`  
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
      "required": ["gear", "concurrency"],
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
        "concurrency": { "type": "integer", "minimum": 1, "maximum": 8 }
      }
    },
    "pending": {
      "type": "object",
      "properties": {
        "status": { "type": "string", "enum": ["PENDING_NEXT_TURN", "APPLIED", "CANCELLED"] },
        "requestedAt": { "type": "string", "format": "date-time" },
        "gear": { "type": "integer", "minimum": 1, "maximum": 4 },
        "concurrency": { "type": "integer", "minimum": 1, "maximum": 8 }
      }
    }
  }
}
```

---

## 2. Handshake State Transitions

```text
               [ Operator clicks Gear button ]
                              │
                              ▼
                   State: PENDING_NEXT_TURN
                              │
               [ Agent reaches turn:start ]
                              │
                              ▼
                   State: APPLIED (active updated)
```

1. **Write (UI Thread):** Extension stages user adjustment in `pending` block with status `PENDING_NEXT_TURN`.
2. **Read (Agent Hook):** `rds-enforcer.js` or agent session controller inspects the JSON file on every prompt or question answer.
3. **Commit:** Active configuration updates to match pending settings, and `pending` is cleared or marked `APPLIED`.
