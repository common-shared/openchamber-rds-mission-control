/**
 * RDS Mission Control Store
 *
 * One file per session: .openchamber/rds-mission-control/<sessionId>.json
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

export const storePath = (sessionId: string) => `.openchamber/rds-mission-control/${sessionId}.json`;

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
