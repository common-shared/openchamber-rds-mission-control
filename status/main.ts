import { connectHost, HostRequestError } from "@openchamber/sdk";
import type { HostReadyContext, SessionSnapshot } from "@openchamber/sdk";
import { applyHostReady } from "@openchamber/sdk/ui";

import { createCard } from "./card.ts";
import {
  INITIAL_DOC,
  storePath,
  type CognitivePhase,
  type GearTransmission,
  type ImpactClass,
  type RDSMissionControlDoc,
} from "../shared/store.ts";

const host = connectHost();
const root = document.querySelector<HTMLDivElement>("#root")!;

let sessionId: string | null = null;
let currentDoc: RDSMissionControlDoc = INITIAL_DOC;

const PROMPT_TEMPLATES: Record<CognitivePhase, string> = {
  M0_EXPLORE: `[M0_EXPLORE / T0_INFORMATIONAL / Gear 1]\nGoal: Brainstorm and explore alternatives for [TOPIC].\nDirectives: Socratic trade-off analysis, zero premature planning blockers.`,
  M1_PROPOSE: `[M1_PROPOSE / T3_FEATURE_CHANGE / Gear 2]\nGoal: Draft formal OpenSpec change proposal for [FEATURE_NAME].\nDeliverables: openspec/changes/<slug>/ (proposal.md, design.md, specs/).`,
  M2_STAGE: `[M2_STAGE / T3_FEATURE_CHANGE / Gear 2]\nGoal: Stage proposals into release milestone [VERSION].\nDeliverables: Milestone charter, dependency DAG, acceptance criteria.`,
  M3_EXECUTE: `[M3_EXECUTE / T3_FEATURE_CHANGE / Gear 3]\nGoal: Implement and test [FEATURE_OR_TASK].\nRules: Dedicated isolated worktree, immediate push to origin, zero --no-verify, update feature catalogue.`,
  M4_AUDIT: `[M4_AUDIT / T1_READ_ONLY_REPO / Gear 2]\nGoal: Audit repository documentation and fleet alignment.\nDirectives: Run rds doctor --fleet, rds drift, and rds validate.`,
  M5_SENSITIVE: `[M5_SENSITIVE / T5_OPERATIONAL_SENSITIVE / Gear 1]\nGoal: Execute sensitive operational task for [TARGET].\nRules: Native Question tool authorization gate before touching credentials or infrastructure.`,
};

/* ------------------------------------------------------------------- Store Sync */

async function readStore(): Promise<RDSMissionControlDoc> {
  if (!sessionId) return INITIAL_DOC;
  try {
    const res = await host.readFile(storePath(sessionId));
    return JSON.parse(res.content) as RDSMissionControlDoc;
  } catch (err) {
    if (err instanceof HostRequestError && err.code === "NOT_FOUND") {
      return INITIAL_DOC;
    }
    return INITIAL_DOC;
  }
}

async function writeStore(doc: RDSMissionControlDoc): Promise<void> {
  if (!sessionId) return;
  const content = JSON.stringify(doc, null, 2);
  await host.writeFile(storePath(sessionId), content);
}

/* ------------------------------------------------------------------- UI Card */

const card = createCard(root, {
  onStageChange(update) {
    void (async () => {
      currentDoc.pending = {
        ...currentDoc.pending,
        ...(update.phase ? { phase: update.phase } : {}),
        ...(update.impact ? { impact: update.impact } : {}),
        ...(update.gear ? { gear: update.gear } : {}),
      };
      if (update.concurrency) {
        currentDoc.concurrency.local = update.concurrency;
      }
      currentDoc.revision++;
      currentDoc.lastUpdated = Date.now();
      await writeStore(currentDoc);
      await host.toast({
        kind: "success",
        message: `Staged: Gear ${update.gear ?? currentDoc.active.gear}, ${(update.impact ?? currentDoc.active.impact).split("_")[0]} (applies next turn)`,
      }).catch(() => undefined);
      card.update(currentDoc);
    })();
  },
  onLaunchSession(phase) {
    void (async () => {
      const template = PROMPT_TEMPLATES[phase];
      try {
        await host.compose({
          text: template,
          mode: "replace",
        });
        await host.toast({
          kind: "info",
          message: `Staged ${phase} prompt in composer`,
        }).catch(() => undefined);
      } catch (err) {
        console.error("Failed to compose prompt draft:", err);
      }
    })();
  },
});

async function refresh(): Promise<void> {
  currentDoc = await readStore();
  card.update(currentDoc);
}

/* ------------------------------------------------------------------- Host Setup */

const applySession = (session: SessionSnapshot | null): void => {
  sessionId = session?.id ?? null;
  void refresh();
};

host.onReady((ctx: HostReadyContext) => {
  applyHostReady(ctx, document.documentElement);
  applySession(ctx.session);
});

host.onSession((session) => {
  applySession(session);
});

host.onSessionLifecycle((event) => {
  if (event.phase === "completed") {
    void refresh();
  }
});

// Periodic refresh when active
setInterval(() => {
  if (document.visibilityState === "hidden") return;
  void refresh();
}, 3000);
