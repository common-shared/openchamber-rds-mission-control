import { connectHost, HostRequestError } from "@openchamber/sdk";
import type { HostReadyContext, SessionSnapshot } from "@openchamber/sdk";
import { applyHostReady } from "@openchamber/sdk/ui";

import { createCard, type CardTab } from "./card.ts";
import {
  createInitialDoc,
  storePath,
  type CognitivePhase,
  type GearTransmission,
  type ImpactClass,
  type RDSMissionControlDoc,
  type SteeringMode,
} from "../shared/store.ts";

const host = connectHost();
const root = document.querySelector<HTMLDivElement>("#root")!;

let sessionId: string | null = null;
let sessionTitle: string | null = null;
let currentDoc: RDSMissionControlDoc = createInitialDoc();
const sessionDocCache = new Map<string, RDSMissionControlDoc>();

const PROMPT_TEMPLATES: Record<CognitivePhase, string> = {
  M0_EXPLORE: `[M0_EXPLORE / T0_INFORMATIONAL / Gear 1]\nGoal: Brainstorm and explore alternatives for [TOPIC].\nDirectives: Socratic trade-off analysis, zero premature planning blockers.`,
  M1_PROPOSE: `[M1_PROPOSE / T3_FEATURE_CHANGE / Gear 2]\nGoal: Draft formal OpenSpec change proposal for [FEATURE_NAME].\nDeliverables: openspec/changes/<slug>/ (proposal.md, design.md, specs/).`,
  M2_STAGE: `[M2_STAGE / T3_FEATURE_CHANGE / Gear 2]\nGoal: Stage proposals into release milestone [VERSION].\nDeliverables: Milestone charter, dependency DAG, acceptance criteria.`,
  M3_EXECUTE: `[M3_EXECUTE / T3_FEATURE_CHANGE / Gear 3]\nGoal: Implement and test [FEATURE_OR_TASK].\nRules: Dedicated isolated worktree, immediate push to origin, zero --no-verify, update feature catalogue.`,
  M4_AUDIT: `[M4_AUDIT / T1_READ_ONLY_REPO / Gear 2]\nGoal: Audit repository documentation and fleet alignment.\nDirectives: Run rds doctor --fleet, rds drift, and rds validate.`,
  M5_SENSITIVE: `[M5_SENSITIVE / T5_OPERATIONAL_SENSITIVE / Gear 1]\nGoal: Execute sensitive operational task for [TARGET].\nRules: Native Question tool authorization gate before touching credentials or infrastructure.`,
};

/* ------------------------------------------------------------------- Git & Project Probes */

async function probeGitBranch(): Promise<{ branch: string; isWorktree: boolean }> {
  try {
    const res = await host.readFile(".git");
    // If .git is a file, it's an isolated worktree (e.g. "gitdir: /path/...")
    if (res.content.startsWith("gitdir:")) {
      const parts = res.content.trim().split("/");
      const worktreeName = parts[parts.length - 1] || "worktree";
      return { branch: worktreeName, isWorktree: true };
    }
  } catch {
    // .git might be a directory
  }

  try {
    const headRes = await host.readFile(".git/HEAD");
    const line = headRes.content.trim();
    if (line.startsWith("ref: refs/heads/")) {
      return { branch: line.replace("ref: refs/heads/", ""), isWorktree: false };
    }
    return { branch: line.slice(0, 8), isWorktree: false };
  } catch {
    return { branch: "dev", isWorktree: false };
  }
}

async function probeFocusProgress(): Promise<{ done: number; total: number; percentage: number } | undefined> {
  try {
    const res = await host.readFile(".planning/STATE.md");
    const matches = res.content.match(/- \[(x|X| )\]/g);
    if (matches && matches.length > 0) {
      const total = matches.length;
      const done = matches.filter((m) => m.toLowerCase().includes("x")).length;
      return {
        done,
        total,
        percentage: Math.round((done / total) * 100),
      };
    }
  } catch {
    // No .planning/STATE.md present
  }
  return undefined;
}

/* ------------------------------------------------------------------- Store Sync */

async function readStore(): Promise<RDSMissionControlDoc> {
  if (!sessionId) {
    return createInitialDoc();
  }

  try {
    const res = await host.readFile(storePath(sessionId));
    const parsed = JSON.parse(res.content) as RDSMissionControlDoc;
    sessionDocCache.set(sessionId, parsed);
    return parsed;
  } catch (err) {
    if (err instanceof HostRequestError && err.code === "NOT_FOUND") {
      // Auto-initialize memory doc for new sessions
      if (sessionDocCache.has(sessionId)) {
        return sessionDocCache.get(sessionId)!;
      }
      const freshDoc = createInitialDoc(sessionId);
      sessionDocCache.set(sessionId, freshDoc);
      return freshDoc;
    }
    return sessionDocCache.get(sessionId) || createInitialDoc(sessionId);
  }
}

async function writeStore(doc: RDSMissionControlDoc): Promise<void> {
  if (!sessionId) return;
  doc.sessionId = sessionId;
  doc.lastUpdated = Date.now();
  sessionDocCache.set(sessionId, doc);
  const content = JSON.stringify(doc, null, 2);
  try {
    await host.writeFile(storePath(sessionId), content);
  } catch (err) {
    console.warn("Could not persist Mission Control doc to disk:", err);
  }
}

/* ------------------------------------------------------------------- UI Card */

const card = createCard(root, {
  onStageChange(update) {
    void (async () => {
      const pending: NonNullable<RDSMissionControlDoc["pending"]> = {
        status: "PENDING_NEXT_TURN",
        requestedAt: Date.now(),
        mode: update.mode,
      };

      if (update.gear && update.gear !== "AUTO") {
        pending.gear = update.gear;
      }
      if (update.impact && update.impact !== "AUTO") {
        pending.impact = update.impact;
      }
      if (update.phase && update.phase !== "AUTO") {
        pending.phase = update.phase;
      }
      if (update.concurrency) {
        pending.concurrency = update.concurrency;
        currentDoc.concurrency.local = update.concurrency;
        currentDoc.concurrency.auto = false;
      }

      currentDoc.pending = pending;
      if (update.mode) {
        currentDoc.active.mode = update.mode;
      }
      currentDoc.revision++;
      currentDoc.lastUpdated = Date.now();

      await writeStore(currentDoc);

      const parts: string[] = [];
      if (pending.gear) parts.push(`Gear ${pending.gear}`);
      if (pending.impact) parts.push(pending.impact.split("_")[0]);
      if (pending.phase) parts.push(pending.phase);

      await host.toast({
        kind: "success",
        message: `Staged: ${parts.length > 0 ? parts.join(", ") : "Settings"} (applies next turn)`,
      }).catch(() => undefined);

      card.update(currentDoc, { id: sessionId, title: sessionTitle || undefined });
    })();
  },

  onResetAuto() {
    void (async () => {
      currentDoc.active.mode = "AUTO";
      currentDoc.concurrency.auto = true;
      currentDoc.pending = {
        status: "PENDING_NEXT_TURN",
        mode: "AUTO",
        requestedAt: Date.now(),
      };
      currentDoc.revision++;
      currentDoc.lastUpdated = Date.now();

      await writeStore(currentDoc);

      await host.toast({
        kind: "info",
        message: "Reset to Autonomous Agent steering mode (Auto)",
      }).catch(() => undefined);

      card.update(currentDoc, { id: sessionId, title: sessionTitle || undefined });
    })();
  },

  onLaunchSession(phase, customTemplate) {
    void (async () => {
      const template = customTemplate || PROMPT_TEMPLATES[phase];
      try {
        await host.compose({
          text: template,
          mode: "replace",
        });
        await host.toast({
          kind: "info",
          message: `Staged ${phase} prompt template in composer`,
        }).catch(() => undefined);
      } catch (err) {
        console.error("Failed to compose prompt draft:", err);
      }
    })();
  },

  onRefresh() {
    void refresh();
  },

  onTabChange(_tab: CardTab, height: number) {
    void host.setHeight(height).catch(() => undefined);
  },
});

/* ------------------------------------------------------------------- Telemetry Refresh */

let isRefreshing = false;

async function refresh(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    currentDoc = await readStore();

    // Enrich with Git and Worktree diagnostics
    const gitInfo = await probeGitBranch();
    currentDoc.active.branch = gitInfo.branch;
    currentDoc.active.isWorktree = gitInfo.isWorktree;

    // Enrich with Focus Progress if available
    const progress = await probeFocusProgress();
    if (progress) {
      currentDoc.active.focusProgress = progress;
    }

    card.update(currentDoc, { id: sessionId, title: sessionTitle || undefined });
  } finally {
    isRefreshing = false;
  }
}

/* ------------------------------------------------------------------- Host Setup */

type ExtendedSessionSnapshot = SessionSnapshot & {
  tool?: { name: string; target?: string | null };
  activity?: "idle" | "running" | "waiting-question" | "waiting-permission" | "unknown";
  context?: { tokens: number; limit: number };
};

const applySession = (session: SessionSnapshot | null): void => {
  const previousId = sessionId;
  sessionId = session?.id ?? null;
  sessionTitle = session?.title ?? null;

  if (session) {
    const extSession = session as ExtendedSessionSnapshot;
    // Enrich with live SDK snapshot telemetry
    if (extSession.tool) {
      currentDoc.active.activeTool = {
        name: extSession.tool.name,
        target: extSession.tool.target,
      };
    }
    if (extSession.activity) {
      currentDoc.status.activity = extSession.activity;
      if (extSession.activity === "running") {
        currentDoc.status.detail = `Running: ${extSession.tool?.name || "tool"}`;
      } else if (extSession.activity === "waiting-question") {
        currentDoc.status.detail = "Awaiting Operator Decision";
      }
    } else if (session.busy) {
      currentDoc.status.activity = "running";
      currentDoc.status.detail = "Agent working...";
    } else {
      currentDoc.status.activity = "idle";
      currentDoc.status.detail = "Ready • Awaiting prompt";
    }

    if (session.model) {
      currentDoc.active.model = session.model;
    }

    if (extSession.context) {
      currentDoc.active.contextTokens = {
        used: extSession.context.tokens,
        limit: extSession.context.limit,
      };
    }
  }

  // If session changed, immediately update UI and trigger fresh read
  if (sessionId !== previousId) {
    card.update(currentDoc, { id: sessionId, title: sessionTitle || undefined });
  }

  void refresh();
};

host.onReady((ctx: HostReadyContext) => {
  applyHostReady(ctx, document.documentElement);
  applySession(ctx.session);
  // Default initial compact height
  void host.setHeight(175).catch(() => undefined);
});

host.onSession((session) => {
  applySession(session);
});

host.onSessionLifecycle((event) => {
  if (event.phase === "started" || event.phase === "completed") {
    void refresh();
  }
});

// Periodic live refresh when tab is visible
setInterval(() => {
  if (document.visibilityState === "hidden") return;
  void refresh();
}, 1500);
