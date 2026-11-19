import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyMutation,
  classifyPromptImpact,
  classifyPromptPhase,
  createInitialDoc,
  deriveGearFromTriad,
  globalStorePath,
  parseDoc,
  projectStorePath,
  serializeDoc,
  storePath,
} from "../shared/store.ts";

describe("store paths", () => {
  it("generates correct project-local and global store paths", () => {
    const sid = "ses_abc123";
    assert.equal(projectStorePath(sid), ".openchamber/rds-mission-control/ses_abc123.json");
    assert.equal(globalStorePath(sid), "~/.openchamber/rds-mission-control/ses_abc123.json");
    assert.equal(storePath(sid), ".openchamber/rds-mission-control/ses_abc123.json");
  });
});

describe("createInitialDoc and mutations", () => {
  it("initializes a valid default document", () => {
    const doc = createInitialDoc("ses_1");
    assert.equal(doc.sessionId, "ses_1");
    assert.equal(doc.active.phase, "M0_EXPLORE");
    assert.equal(doc.active.impact, "T0_INFORMATIONAL");
    assert.equal(doc.active.gear, 1);
    assert.equal(doc.active.mode, "AUTO");
    assert.equal(doc.active.rdsStatus, "ENFORCED");
    assert.equal(doc.revision, 0);
  });

  it("applies mutation and increments revision", () => {
    const initial = createInitialDoc("ses_1");
    const mutated = applyMutation(initial, (d) => {
      d.active.gear = 3;
      d.active.phase = "M3_EXECUTE";
    });

    assert.equal(mutated.revision, 1);
    assert.equal(mutated.active.gear, 3);
    assert.equal(mutated.active.phase, "M3_EXECUTE");
    assert.equal(initial.revision, 0); // immutable
  });

  it("parses and serializes doc cleanly", () => {
    const doc = createInitialDoc("ses_2");
    const json = serializeDoc(doc);
    assert.ok(json.endsWith("\n"));

    const parsed = parseDoc(json, "ses_2");
    assert.equal(parsed.sessionId, "ses_2");
    assert.equal(parsed.active.mode, "AUTO");

    const fallback = parseDoc("invalid-json", "ses_3");
    assert.equal(fallback.sessionId, "ses_3");
    assert.equal(fallback.active.phase, "M0_EXPLORE");
  });
});

describe("UDIS deterministic classification", () => {
  it("classifies cognitive phase accurately (M0 - M5)", () => {
    assert.equal(classifyPromptPhase("Let's explore alternatives and brainstorm trade-offs"), "M0_EXPLORE");
    assert.equal(classifyPromptPhase("Draft an openspec propose RFC change proposal for auth"), "M1_PROPOSE");
    assert.equal(classifyPromptPhase("Stage milestone release v1.0.0 and define roadmap aims"), "M2_STAGE");
    assert.equal(classifyPromptPhase("Run rds audit and drift diagnostics check"), "M4_AUDIT");
    assert.equal(classifyPromptPhase("Deploy to production cluster immediately"), "M5_SENSITIVE");
    assert.equal(classifyPromptPhase("Fix bug in status/main.ts and implement unit test"), "M3_EXECUTE");
  });

  it("classifies impact class accurately (T0 - T5)", () => {
    assert.equal(classifyPromptImpact("What is the difference between let and const in JavaScript?"), "T0_INFORMATIONAL");
    assert.equal(classifyPromptImpact("Read status/main.ts and inspect line 50"), "T1_READ_ONLY_REPO");
    assert.equal(classifyPromptImpact("Fix typo in README.md and update comments"), "T2_SMALL_CHANGE");
    assert.equal(classifyPromptImpact("Add database migration and new public API endpoint for feature"), "T3_FEATURE_CHANGE");
    assert.equal(classifyPromptImpact("Execute fleet-wide multi-phase programme across all repos"), "T4_MULTI_PHASE");
    assert.equal(classifyPromptImpact("Drop database production table and purge records"), "T5_OPERATIONAL_SENSITIVE");
  });

  it("derives gear transmission correctly from triad", () => {
    assert.equal(deriveGearFromTriad("T0_INFORMATIONAL", "M0_EXPLORE"), 1);
    assert.equal(deriveGearFromTriad("T1_READ_ONLY_REPO", "M4_AUDIT"), 2);
    assert.equal(deriveGearFromTriad("T2_SMALL_CHANGE", "M3_EXECUTE"), 2);
    assert.equal(deriveGearFromTriad("T3_FEATURE_CHANGE", "M3_EXECUTE"), 3);
    assert.equal(deriveGearFromTriad("T4_MULTI_PHASE", "M3_EXECUTE"), 4);
    assert.equal(deriveGearFromTriad("T5_OPERATIONAL_SENSITIVE", "M5_SENSITIVE"), 1);
  });
});
