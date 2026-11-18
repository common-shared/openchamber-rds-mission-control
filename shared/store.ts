/**
 * RDS Mission Control Store
 *
 * One file per session: .openchamber/rds-mission-control/<sessionId>.json
 */

export type CognitivePhase = "M0_EXPLORE" | "M1_PROPOSE" | "M2_STAGE" | "M3_EXECUTE" | "M4_AUDIT" | "M5_SENSITIVE";
export type ImpactClass = "T0_INFORMATIONAL" | "T1_READ_ONLY_REPO" | "T2_SMALL_CHANGE" | "T3_FEATURE_CHANGE" | "T4_MULTI_PHASE" | "T5_OPERATIONAL_SENSITIVE";
export type GearTransmission = 1 | 2 | 3 | 4;

export interface RDSTelemetry {
  phase: CognitivePhase;
  impact: ImpactClass;
  gear: GearTransmission;
}

export interface RDSMissionControlDoc {
  revision: number;
  active: RDSTelemetry;
  /** Steering handshake: staged changes waiting for the next turn boundary. */
  pending?: Partial<RDSTelemetry>;
  /** Parallelism config: global GSD sync + repo-specific overrides. */
  concurrency: {
    global: number;
    local?: number;
  };
  /** Status: what is currently happening in the session (mirrored from focus). */
  status: {
    state: string;
    detail: string;
    progress?: number;
  };
  lastUpdated: number;
}

export const storePath = (sessionId: string) => `.openchamber/rds-mission-control/${sessionId}.json`;

export const INITIAL_DOC: RDSMissionControlDoc = {
  revision: 0,
  active: {
    phase: "M0_EXPLORE",
    impact: "T0_INFORMATIONAL",
    gear: 1,
  },
  concurrency: {
    global: 4,
  },
  status: {
    state: "idle",
    detail: "Waiting for prompt...",
  },
  lastUpdated: Date.now(),
};

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
