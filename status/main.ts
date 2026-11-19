import { connectHost, HostRequestError } from "@openchamber/sdk";
import type { HostReadyContext, SessionSnapshot } from "@openchamber/sdk";
import { applyHostReady } from "@openchamber/sdk/ui";

import { createCard, type CardTab } from "./card.ts";
import {
  createInitialDoc,
  projectStorePath,
  globalStorePath,
  storePath,
  classifyPromptPhase,
  classifyPromptImpact,
  deriveGearFromTriad,
  type CognitivePhase,
  type GearTransmission,
  type ImpactClass,
  type RDSBootstrapStatus,
  type RDSMissionControlDoc,
  type SteeringMode,
} from "../shared/store.ts";

const host = connectHost();
const root = document.querySelector<HTMLDivElement>("#root")!;

let sessionId: string | null = null;
let sessionTitle: string | null = null;
let latestFocusGoal: string | null = null;
let currentDoc: RDSMissionControlDoc = createInitialDoc();
const sessionDocCache = new Map<string, RDSMissionControlDoc>();
const knownSessions = new Map<string, any>();
const projectUnsubs = new Map<string, () => void>();

const PROMPT_TEMPLATES: Record<CognitivePhase, string> = {
  M0_EXPLORE: `[M0_EXPLORE / T0_INFORMATIONAL / Gear 1]\nGoal: Brainstorm and explore alternatives for [TOPIC].\nDirectives: Socratic trade-off analysis, zero premature planning blockers.`,
  M1_PROPOSE: `[M1_PROPOSE / T3_FEATURE_CHANGE / Gear 2]\nGoal: Draft formal OpenSpec change proposal for [FEATURE_NAME].\nDeliverables: openspec/changes/<slug>/ (proposal.md, design.md, specs/).`,
  M2_STAGE: `[M2_STAGE / T3_FEATURE_CHANGE / Gear 2]\nGoal: Stage proposals into release milestone [VERSION].\nDeliverables: Milestone charter, dependency DAG, acceptance criteria.`,
  M3_EXECUTE: `[M3_EXECUTE / T3_FEATURE_CHANGE / Gear 3]\nGoal: Implement and test [FEATURE_OR_TASK].\nRules: Dedicated isolated worktree, immediate push to origin, zero --no-verify, update feature catalogue.`,
  M4_AUDIT: `[M4_AUDIT / T1_READ_ONLY_REPO / Gear 2]\nGoal: Audit repository documentation and fleet alignment.\nDirectives: Run rds doctor --fleet, rds drift, and rds validate.`,
  M5_SENSITIVE: `[M5_SENSITIVE / T5_OPERATIONAL_SENSITIVE / Gear 1]\nGoal: Execute sensitive operational task for [TARGET].\nRules: Native Question tool authorization gate before touching credentials or infrastructure.`,
};

/* ------------------------------------------------------------------- Git & Project Probes */

async function probeRdsStatus(): Promise<RDSBootstrapStatus> {
  try {
    const res = await host.readFile(".rds/config.json");
    try {
      const cfg = JSON.parse(res.content);
      if (cfg && (cfg.rds_version || cfg.schema_version)) {
        return "ENFORCED";
      }
      return "ENFORCED_WITH_WARNINGS";
    } catch {
      return "DEGRADED_READ_ONLY";
    }
  } catch {
    // .rds/config.json missing: check if git repo
    try {
      await host.readFile(".git/HEAD");
      return "UNMANAGED_REPOSITORY";
    } catch {
      try {
        const git = await host.readFile(".git");
        if (git.content.startsWith("gitdir:")) {
          return "UNMANAGED_REPOSITORY";
        }
      } catch {
        // Not a git repository
      }
      return "UNMANAGED_REPOSITORY";
    }
  }
}

async function probeGitBranch(): Promise<{ branch: string; isWorktree: boolean }> {
  // Check live session record worktree first
  const rec = sessionId ? knownSessions.get(sessionId) : null;
  if (rec?.worktree?.branch) {
    return { branch: rec.worktree.branch, isWorktree: true };
  }

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

async function probeFocusProgress(sid: string): Promise<{ done: number; total: number; percentage: number } | undefined> {
  // 1. Try .planning/STATE.md
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
    // fallback
  }

  // 2. Try session-focus store (.openchamber/session-focus/<sid>.json or ~/.openchamber/...)
  const focusPaths = [
    `.openchamber/session-focus/${sid}.json`,
    `~/.openchamber/session-focus/${sid}.json`,
  ];
  for (const p of focusPaths) {
    try {
      const res = await host.readFile(p);
      const parsed = JSON.parse(res.content);
      if (parsed) {
        if (parsed.focus && typeof parsed.focus === "string") {
          latestFocusGoal = parsed.focus;
        }
        if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          const total = parsed.actions.length;
          const done = parsed.actions.filter((a: any) => a.state === "done" || a.state === "dropped").length;
          return {
            done,
            total,
            percentage: Math.round((done / total) * 100),
          };
        }
      }
    } catch {
      // continue search
    }
  }

  return undefined;
}

/* ------------------------------------------------------------------- Store Sync */

async function readStore(): Promise<RDSMissionControlDoc> {
  if (!sessionId) {
    return createInitialDoc();
  }

  // 1. Try project-local store
  try {
    const res = await host.readFile(projectStorePath(sessionId));
    const parsed = JSON.parse(res.content) as RDSMissionControlDoc;
    if (parsed && parsed.active) {
      sessionDocCache.set(sessionId, parsed);
      return parsed;
    }
  } catch {
    // project store not found
  }

  // 2. Try global store ~/.openchamber/rds-mission-control/<sessionId>.json
  try {
    const res = await host.readFile(globalStorePath(sessionId));
    const parsed = JSON.parse(res.content) as RDSMissionControlDoc;
    if (parsed && parsed.active) {
      sessionDocCache.set(sessionId, parsed);
      return parsed;
    }
  } catch {
    // global store not found
  }

  // 3. Fallback to session cache
  if (sessionDocCache.has(sessionId)) {
    return sessionDocCache.get(sessionId)!;
  }

  // 4. Fresh doc fallback
  const freshDoc = createInitialDoc(sessionId);
  sessionDocCache.set(sessionId, freshDoc);
  return freshDoc;
}

async function writeStore(doc: RDSMissionControlDoc): Promise<void> {
  if (!sessionId) return;
  doc.sessionId = sessionId;
  doc.lastUpdated = Date.now();
  sessionDocCache.set(sessionId, doc);
  const content = JSON.stringify(doc, null, 2);

  // Write to project store
  try {
    await host.writeFile(projectStorePath(sessionId), content);
  } catch (err) {
    console.warn("Could not persist Mission Control doc to project disk:", err);
  }

  // Write to global store cache
  try {
    await host.writeFile(globalStorePath(sessionId), content);
  } catch {
    // global write optional
  }
}

/* ------------------------------------------------------------------- Workspace Sessions Telemetry */

function enrichFromSessionRecord(record: any): void {
  if (!record) return;

  if (record.context && typeof record.context.tokens === "number") {
    currentDoc.active.contextTokens = {
      used: record.context.tokens,
      limit: record.context.limit ?? 200000,
    };
  }

  if (record.tool && record.tool.name) {
    currentDoc.active.activeTool = {
      name: record.tool.name,
      target: record.tool.target ?? null,
    };
  } else if (record.activity && record.activity !== "running") {
    currentDoc.active.activeTool = undefined;
  }

  if (record.activity) {
    currentDoc.status.activity = record.activity;
    if (record.activity === "running") {
      const toolPart = record.tool?.name
        ? `${record.tool.name} ${record.tool.target || ""}`.trim()
        : "tool";
      currentDoc.status.detail = `Running: ${toolPart}`;
    } else if (record.activity === "waiting-question") {
      currentDoc.status.detail = "Awaiting Operator Decision";
    } else if (record.activity === "waiting-permission") {
      currentDoc.status.detail = "Awaiting Permission Approval";
    } else if (record.activity === "idle") {
      currentDoc.status.detail = "Ready • Awaiting prompt";
    }
  }

  if (record.worktree && record.worktree.branch) {
    currentDoc.active.branch = record.worktree.branch;
    currentDoc.active.isWorktree = true;
  }
}

async function syncWorkspaceSessions(): Promise<void> {
  try {
    const projectsSnap = await host.listProjects();
    if (projectsSnap && Array.isArray(projectsSnap.projects)) {
      for (const proj of projectsSnap.projects) {
        try {
          const sessSnap = await host.listSessions(proj.id);
          if (sessSnap && Array.isArray(sessSnap.sessions)) {
            for (const s of sessSnap.sessions) {
              knownSessions.set(s.id, s);
            }
          }
        } catch {
          // ignore project session read error
        }

        if (!projectUnsubs.has(proj.id)) {
          try {
            const unsub = await host.onSessions(proj.id, (sessSnap) => {
              if (sessSnap && Array.isArray(sessSnap.sessions)) {
                for (const s of sessSnap.sessions) {
                  knownSessions.set(s.id, s);
                }
                void refresh();
              }
            });
            projectUnsubs.set(proj.id, unsub);
          } catch {
            // ignore subscription error
          }
        }
      }
    }
  } catch {
    // listProjects not available or rejected
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

    // 1. Enrich from SDK workspace session record if known
    const rec = sessionId ? knownSessions.get(sessionId) : null;
    if (rec) {
      enrichFromSessionRecord(rec);
    }

    // 2. Enrich with Git and Worktree diagnostics
    const gitInfo = await probeGitBranch();
    currentDoc.active.branch = gitInfo.branch;
    currentDoc.active.isWorktree = gitInfo.isWorktree;

    // 3. Enrich with actual RDS Bootstrap Status
    const rdsStatus = await probeRdsStatus();
    currentDoc.active.rdsStatus = rdsStatus;

    // 4. Enrich with Focus Progress if available
    if (sessionId) {
      const progress = await probeFocusProgress(sessionId);
      if (progress) {
        currentDoc.active.focusProgress = progress;
      }
    }

    // 5. AUTO Mode Real-time Inference (when in Auto mode and values are default or uninitialized)
    if (currentDoc.active.mode === "AUTO") {
      const candidateText = latestFocusGoal || sessionTitle || rec?.title || "";
      if (candidateText && candidateText.trim().length > 0) {
        const inferredPhase = classifyPromptPhase(candidateText);
        const inferredImpact = classifyPromptImpact(candidateText);
        const inferredGear = deriveGearFromTriad(inferredImpact, inferredPhase);

        // If doc has default initial values, update to inferred real-world values
        if (currentDoc.revision === 0 || (currentDoc.active.phase === "M0_EXPLORE" && currentDoc.active.impact === "T0_INFORMATIONAL")) {
          currentDoc.active.phase = inferredPhase;
          currentDoc.active.impact = inferredImpact;
          currentDoc.active.gear = inferredGear;
        }
      }
    }

    card.update(currentDoc, { id: sessionId, title: sessionTitle || undefined });
  } finally {
    isRefreshing = false;
  }
}

/* ------------------------------------------------------------------- Host Setup */

const applySession = (session: SessionSnapshot | null): void => {
  const previousId = sessionId;
  sessionId = session?.id ?? null;
  sessionTitle = session?.title ?? null;

  if (session) {
    if (session.model) {
      currentDoc.active.model = session.model;
    }

    const rec = sessionId ? knownSessions.get(sessionId) : null;
    if (rec) {
      enrichFromSessionRecord(rec);
    } else if (session.busy) {
      currentDoc.status.activity = "running";
      currentDoc.status.detail = "Agent working...";
    } else {
      currentDoc.status.activity = "idle";
      currentDoc.status.detail = "Ready • Awaiting prompt";
    }
  }

  // If session changed, reset focus goal and trigger fresh read
  if (sessionId !== previousId) {
    latestFocusGoal = null;
    card.update(currentDoc, { id: sessionId, title: sessionTitle || undefined });
  }

  void refresh();
};

host.onReady((ctx: HostReadyContext) => {
  applyHostReady(ctx, document.documentElement);
  applySession(ctx.session);
  // Default initial compact height
  void host.setHeight(175).catch(() => undefined);
  void syncWorkspaceSessions();
});

host.onSession((session) => {
  applySession(session);
});

try {
  void host.onProjects?.(() => {
    void syncWorkspaceSessions();
  });
} catch {
  // onProjects listener optional
}

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
