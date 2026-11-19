/**
 * RDS Mission Control Store
 *
 * One file per session:
 * - Project-local: .openchamber/rds-mission-control/<sessionId>.json
 * - Global cache:  ~/.openchamber/rds-mission-control/<sessionId>.json
 * Compliant with RDS v0.8.5 & UDIS Steerable Autonomy specifications.
 */

export type CognitivePhase =
  | "M0_EXPLORE"
  | "M1_PROPOSE"
  | "M2_STAGE"
  | "M3_EXECUTE"
  | "M4_AUDIT"
  | "M5_SENSITIVE";

export type ImpactClass =
  | "T0_INFORMATIONAL"
  | "T1_READ_ONLY_REPO"
  | "T2_SMALL_CHANGE"
  | "T3_FEATURE_CHANGE"
  | "T4_MULTI_PHASE"
  | "T5_OPERATIONAL_SENSITIVE";

export type GearTransmission = 1 | 2 | 3 | 4;

export type SteeringMode = "AUTO" | "MANUAL";

export type RDSBootstrapStatus =
  | "ENFORCED"
  | "ENFORCED_WITH_WARNINGS"
  | "DEGRADED_READ_ONLY"
  | "UNMANAGED_REPOSITORY";

export interface RDSTelemetry {
  phase: CognitivePhase;
  impact: ImpactClass;
  gear: GearTransmission;
  mode: SteeringMode;
  rdsStatus?: RDSBootstrapStatus;
  branch?: string;
  isWorktree?: boolean;
  gitDirty?: boolean;
  model?: string;
  contextTokens?: {
    used: number;
    limit: number;
  };
  activeTool?: {
    name: string;
    target?: string | null;
  };
  focusProgress?: {
    done: number;
    total: number;
    percentage: number;
  };
}

export interface PendingSteeringHandshake {
  status?: "PENDING_NEXT_TURN" | "APPLIED" | "CANCELLED";
  requestedAt?: number;
  mode?: SteeringMode;
  phase?: CognitivePhase;
  impact?: ImpactClass;
  gear?: GearTransmission;
  concurrency?: number;
}

export interface RDSMissionControlDoc {
  sessionId?: string;
  revision: number;
  active: RDSTelemetry;
  /** Steering handshake: staged changes waiting for the next turn boundary. */
  pending?: PendingSteeringHandshake;
  /** Parallelism config: global GSD sync + repo-specific overrides. */
  concurrency: {
    global: number;
    local?: number;
    auto?: boolean;
  };
  /** Status: what is currently happening in the session (mirrored from focus and SDK). */
  status: {
    state: string;
    detail: string;
    progress?: number;
    activity?: "idle" | "running" | "waiting-question" | "waiting-permission" | "unknown";
  };
  lastUpdated: number;
}

/** Project-local path relative to open workspace root */
export const projectStorePath = (sessionId: string) => `.openchamber/rds-mission-control/${sessionId}.json`;

/** Global path under ~/.openchamber */
export const globalStorePath = (sessionId: string) => `~/.openchamber/rds-mission-control/${sessionId}.json`;

/** Canonical default path */
export const storePath = projectStorePath;

/** Factory to create fresh, session-isolated initial documents. */
export function createInitialDoc(sessionId?: string): RDSMissionControlDoc {
  return {
    sessionId,
    revision: 0,
    active: {
      phase: "M0_EXPLORE",
      impact: "T0_INFORMATIONAL",
      gear: 1,
      mode: "AUTO",
      rdsStatus: "ENFORCED",
    },
    concurrency: {
      global: 4,
      auto: true,
    },
    status: {
      state: "idle",
      detail: "Ready • Autonomous agent steering active",
      activity: "idle",
    },
    lastUpdated: Date.now(),
  };
}

/** Legacy singleton getter (returns a deep copy to prevent cross-session contamination). */
export const INITIAL_DOC: RDSMissionControlDoc = createInitialDoc();

/** Apply a mutation to the doc with revision tracking. */
export function applyMutation(
  current: RDSMissionControlDoc,
  update: (doc: RDSMissionControlDoc) => void
): RDSMissionControlDoc {
  const next = JSON.parse(JSON.stringify(current)) as RDSMissionControlDoc;
  update(next);
  next.revision++;
  next.lastUpdated = Date.now();
  return next;
}

/** Parse JSON safely with fallback to fresh document. */
export function parseDoc(content?: string, sessionId?: string): RDSMissionControlDoc {
  if (!content || typeof content !== "string") {
    return createInitialDoc(sessionId);
  }
  try {
    const parsed = JSON.parse(content) as RDSMissionControlDoc;
    if (parsed && typeof parsed === "object" && parsed.active) {
      if (sessionId && !parsed.sessionId) {
        parsed.sessionId = sessionId;
      }
      return parsed;
    }
  } catch {
    // Malformed JSON fallback
  }
  return createInitialDoc(sessionId);
}

/** Serialize doc to formatted JSON string. */
export function serializeDoc(doc: RDSMissionControlDoc): string {
  return JSON.stringify(doc, null, 2) + "\n";
}

/* ------------------------------------------------------------------- UDIS Deterministic Classifiers */

/**
 * Deterministically classifies cognitive phase / interaction modality (UDIS Dimension 1).
 */
export function classifyPromptPhase(text: string): CognitivePhase {
  if (!text || typeof text !== "string") {
    return "M0_EXPLORE";
  }

  const lower = text.toLowerCase();

  // M5: Privileged / sensitive operations
  const m5Patterns = [
    /\b(production\s+deploy|deploy\s+(to\s+)?prod(uction)?)\b/,
    /\b(drop\s+database|drop\s+table|purge\s+database|truncate\s+table)\b/,
    /\b(systemctl\s+(stop|disable|restart|reload)|service\s+\w+\s+(stop|restart))\b/,
    /\b(rm\s+-[rR]f\s+(\/|~\/workspace\/repos))\b/,
    /\b(delete\s+(repository|repo)\s+[\w-]+)\b/,
    /\b(private\s+key|aws_secret_access_key|token_transfer)\b/,
  ];
  if (m5Patterns.some((rx) => rx.test(lower))) {
    return "M5_SENSITIVE";
  }

  // M0: Brainstorming, ideation, exploratory spikes, Socratic dialogue
  const m0Patterns = [
    /\b(explore|brainstorm|ideat(e|ion)|what\s+if|socratic|spike|sketch|discuss|thoughts\s+on|compare\s+(options|alternatives)|look\s+into)\b/,
    /\b(how\s+should\s+we|options\s+for|trade-offs?|pros\s+and\s+cons|brainstorming)\b/,
    /\bopenspec\s+explore\b/,
  ];
  if (m0Patterns.some((rx) => rx.test(lower))) {
    return "M0_EXPLORE";
  }

  // M1: Formal change proposals and design contracts
  const m1Patterns = [
    /\b(propose|proposal|design\s+contract|spec\s+delta|openspec\s+(propose|new|change)|rfc|change\s+proposal)\b/,
  ];
  if (m1Patterns.some((rx) => rx.test(lower))) {
    return "M1_PROPOSE";
  }

  // M2: Milestone staging and version definition
  const m2Patterns = [
    /\b(define\s+version|stage\s+milestone|release\s+charter|group\s+proposals|milestone\s+aims|set\s+goals|roadmap\s+for|next\s+version)\b/,
    /\b(release\s+v\d+\.\d+\.\d+|stage\s+v\d+\.\d+\.\d+)\b/,
  ];
  if (m2Patterns.some((rx) => rx.test(lower))) {
    return "M2_STAGE";
  }

  // M4: Diagnostics, drift, and read-only audits
  const m4Patterns = [
    /\b(audit|doctor|drift|diagnos(e|tics)|check-policy|validate|health\s+check)\b/,
  ];
  if (m4Patterns.some((rx) => rx.test(lower))) {
    return "M4_AUDIT";
  }

  // M3: Execution (implementation, wave execution, bugfix, build)
  return "M3_EXECUTE";
}

/**
 * Deterministically classifies incoming user prompts into T0-T5 (UDIS Dimension 2: Impact Class).
 */
export function classifyPromptImpact(text: string): ImpactClass {
  if (!text || typeof text !== "string") {
    return "T0_INFORMATIONAL";
  }

  const lower = text.toLowerCase();

  // T5: Operational sensitive actions
  const t5Patterns = [
    /\b(production\s+deploy|deploy\s+(to\s+)?prod(uction)?)\b/,
    /\b(drop\s+database|drop\s+table|purge\s+database|truncate\s+table)\b/,
    /\b(systemctl\s+(stop|disable|restart|reload)|service\s+\w+\s+(stop|restart))\b/,
    /\b(rm\s+-[rR]f\s+(\/|~\/workspace\/repos))\b/,
    /\b(delete\s+(repository|repo)\s+[\w-]+)\b/,
    /\b(private\s+key|aws_secret_access_key|token_transfer)\b/,
  ];
  if (t5Patterns.some((rx) => rx.test(lower))) {
    return "T5_OPERATIONAL_SENSITIVE";
  }

  // T4: Multi-phase / cross-repo programme / fleet rollout
  const t4Patterns = [
    /\b(programme|fleet|rollout|multi-phase|phases?\s+\d+\s+to\s+\d+|milestone|across\s+all\s+\d+\s+repos)\b/,
  ];
  if (t4Patterns.some((rx) => rx.test(lower))) {
    return "T4_MULTI_PHASE";
  }

  // T3: Feature / architectural change / schema change
  const t3DirectPatterns = [
    /\b(feature|architectur(e|al)|schema\s+migration|database\s+migration|public\s+api|new\s+system|new\s+endpoint|redesign|refactor\s+subsystem|microservice)\b/,
  ];
  if (t3DirectPatterns.some((rx) => rx.test(lower))) {
    return "T3_FEATURE_CHANGE";
  }

  // Check for repository mutation indicators
  const mutationPatterns = [
    /\b(implement|create|write|modify|edit|update|fix|refactor|delete|remove|add|scaffold|build|migrate|bump|release|ship|patch|rollout|adopt|upgrade|onboard|execute|run)\b/,
  ];
  if (mutationPatterns.some((rx) => rx.test(lower))) {
    return "T2_SMALL_CHANGE";
  }

  // Read-only repo queries vs generic informational
  const repoQueryPatterns = [
    /\b(explain|where\s+is|how\s+does|inspect|search|grep|read|review|find|check|audit|diff|status|doctor|validate)\b/,
    /\.(ts|js|py|json|md|yaml|yml|go|rs|c|cpp|sh)\b/,
    /\b(function|class|method|module|component|test|variable|file|dir|path)\b/,
  ];
  if (repoQueryPatterns.some((rx) => rx.test(lower))) {
    return "T1_READ_ONLY_REPO";
  }

  return "T0_INFORMATIONAL";
}

/**
 * Derives appropriate 4-gear autonomy transmission from Impact Class and Cognitive Phase.
 */
export function deriveGearFromTriad(impact: ImpactClass, phase: CognitivePhase): GearTransmission {
  if (phase === "M5_SENSITIVE" || impact === "T5_OPERATIONAL_SENSITIVE") {
    return 1; // Strict human-in-the-loop gate
  }
  if (impact === "T4_MULTI_PHASE") {
    return 4; // Multi-phase parallel fleet autonomy
  }
  if (impact === "T3_FEATURE_CHANGE" || phase === "M3_EXECUTE") {
    if (impact === "T2_SMALL_CHANGE") return 2;
    if (impact === "T3_FEATURE_CHANGE") return 3;
    return 2;
  }
  if (impact === "T1_READ_ONLY_REPO" || phase === "M4_AUDIT" || phase === "M1_PROPOSE" || phase === "M2_STAGE") {
    return 2;
  }
  return 1; // T0 / M0
}
