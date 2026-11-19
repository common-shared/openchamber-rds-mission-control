/**
 * RDS Mission Control Card
 *
 * Renders the compact, tabbed Mission Control panel with live telemetry,
 * steerable autonomy controls, and full 6-phase session launchers.
 */

import {
  type RDSMissionControlDoc,
  type CognitivePhase,
  type ImpactClass,
  type GearTransmission,
  type SteeringMode,
} from "../shared/store.ts";

export type CardTab = "monitor" | "steering" | "launcher";

export interface CardHandlers {
  onStageChange(update: {
    gear?: GearTransmission | "AUTO";
    impact?: ImpactClass | "AUTO";
    phase?: CognitivePhase | "AUTO";
    concurrency?: number;
    mode?: SteeringMode;
  }): void;
  onResetAuto(): void;
  onLaunchSession(phase: CognitivePhase, customTemplate?: string): void;
  onRefresh(): void;
  onTabChange?(tab: CardTab, height: number): void;
}

export function createCard(root: HTMLElement, handlers: CardHandlers) {
  let activeTab: CardTab = "monitor";

  root.innerHTML = `
    <!-- Top Header -->
    <div class="mc-header">
      <div class="mc-title-group">
        <span class="mc-title">📡 RDS Mission Control</span>
        <span id="session-chip" class="session-chip">#no-session</span>
      </div>
      <div class="mc-actions">
        <div id="pulse-indicator" class="pulse-indicator">
          <span id="pulse-dot" class="pulse-dot pulse"></span>
          <span id="pulse-text">LIVE</span>
        </div>
        <button id="btn-refresh" class="icon-btn" title="Refresh Telemetry">🔄</button>
      </div>
    </div>

    <!-- Segmented Navigation -->
    <div class="mc-nav">
      <button class="tab-btn active" data-tab="monitor">📡 Monitor</button>
      <button class="tab-btn" data-tab="steering">⚙️ Steering</button>
      <button class="tab-btn" data-tab="launcher">🚀 Launch</button>
    </div>

    <!-- TAB 1: MONITORING -->
    <div id="panel-monitor" class="tab-panel">
      <div class="metric-card">
        <div class="telemetry-row">
          <div class="telemetry-cell">
            <label>PHASE</label>
            <div id="val-phase" class="badge">---</div>
          </div>
          <div class="telemetry-cell">
            <label>IMPACT</label>
            <div id="val-impact" class="badge">---</div>
          </div>
          <div class="telemetry-cell">
            <label>GEAR</label>
            <div id="val-gear" class="badge">---</div>
          </div>
        </div>

        <div class="telemetry-row">
          <div class="telemetry-cell">
            <label>RDS STATUS</label>
            <div id="val-rds" class="badge">ENFORCED</div>
          </div>
          <div class="telemetry-cell">
            <label>BRANCH</label>
            <div id="val-branch" class="badge" title="Active Branch">dev</div>
          </div>
          <div class="telemetry-cell">
            <label>CONTEXT</label>
            <div id="val-context" class="badge" title="Tokens used / limit">-- / --</div>
          </div>
        </div>

        <div id="pending-banner" class="pending-banner hidden">
          <span>⚠️ STAGED:</span>
          <span id="pending-text" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
        </div>

        <div class="status-line">
          <label>ACTIVITY:</label>
          <span id="val-activity">Idle</span>
        </div>

        <div id="progress-container" class="progress-container">
          <div class="progress-header">
            <span>Actions Progress</span>
            <span id="progress-ratio">0/0 done</span>
          </div>
          <div class="progress-track">
            <div id="progress-fill" class="progress-fill"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: STEERING -->
    <div id="panel-steering" class="tab-panel hidden">
      <div class="metric-card">
        <div class="status-line" style="margin-bottom: 2px;">
          <label>MODE:</label>
          <span id="steering-mode-badge" class="badge badge-mode-auto">🤖 AUTO (Agent Decides)</span>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>GEAR</label>
            <select id="select-gear">
              <option value="AUTO" selected>🤖 Auto (Agent)</option>
              <option value="1">Gear 1: Manual Step</option>
              <option value="2">Gear 2: Interactive</option>
              <option value="3">Gear 3: Supervised</option>
              <option value="4">Gear 4: Headless</option>
            </select>
          </div>

          <div class="form-group">
            <label>IMPACT</label>
            <select id="select-impact">
              <option value="AUTO" selected>🤖 Auto (Agent)</option>
              <option value="T0_INFORMATIONAL">T0: Info</option>
              <option value="T1_READ_ONLY_REPO">T1: Read-Only</option>
              <option value="T2_SMALL_CHANGE">T2: Small Fix</option>
              <option value="T3_FEATURE_CHANGE">T3: Feature</option>
              <option value="T4_MULTI_PHASE">T4: Programme</option>
              <option value="T5_OPERATIONAL_SENSITIVE">T5: Sensitive</option>
            </select>
          </div>

          <div class="form-group">
            <label>PHASE REDIRECT</label>
            <select id="select-phase">
              <option value="AUTO" selected>🤖 Auto (Current)</option>
              <option value="M0_EXPLORE">M0: Explore</option>
              <option value="M1_PROPOSE">M1: Propose</option>
              <option value="M2_STAGE">M2: Stage</option>
              <option value="M3_EXECUTE">M3: Execute</option>
              <option value="M4_AUDIT">M4: Audit</option>
              <option value="M5_SENSITIVE">M5: Sensitive</option>
            </select>
          </div>

          <div class="form-group">
            <label>WORKERS</label>
            <div class="stepper-row">
              <button id="btn-concurrency-minus" class="stepper-btn">-</button>
              <input type="number" id="input-concurrency" class="stepper-input" min="1" max="16" value="4">
              <button id="btn-concurrency-plus" class="stepper-btn">+</button>
            </div>
          </div>
        </div>

        <div class="btn-row">
          <button id="btn-apply" class="primary-btn">Stage for Next Turn</button>
          <div style="display: flex; gap: 3px;">
            <button id="btn-reset-auto" class="secondary-btn" title="Revert to autonomous agent decision">↩️ Auto</button>
            <button id="btn-hold" class="danger-btn" title="Intercept & switch to Gear 1 immediately">🛑 Hold</button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: LAUNCHER -->
    <div id="panel-launcher" class="tab-panel hidden">
      <div class="metric-card">
        <div class="launcher-section-title">Cognitive Archetypes (M0–M5)</div>
        <div class="launcher-grid">
          <button class="launcher-btn" data-phase="M0_EXPLORE">
            <span class="name">🧠 M0_EXPLORE</span>
            <span class="desc">Socratic trade-offs</span>
          </button>
          <button class="launcher-btn" data-phase="M1_PROPOSE">
            <span class="name">📝 M1_PROPOSE</span>
            <span class="desc">OpenSpec proposals</span>
          </button>
          <button class="launcher-btn" data-phase="M2_STAGE">
            <span class="name">📋 M2_STAGE</span>
            <span class="desc">Milestone staging</span>
          </button>
          <button class="launcher-btn" data-phase="M3_EXECUTE">
            <span class="name">⚡ M3_EXECUTE</span>
            <span class="desc">Worktree build & test</span>
          </button>
          <button class="launcher-btn" data-phase="M4_AUDIT">
            <span class="name">🔍 M4_AUDIT</span>
            <span class="desc">Fleet drift & health</span>
          </button>
          <button class="launcher-btn" data-phase="M5_SENSITIVE">
            <span class="name">🔐 M5_SENSITIVE</span>
            <span class="desc">Infra & auth gates</span>
          </button>
        </div>

        <div class="launcher-section-title">Quick Presets</div>
        <div class="launcher-grid">
          <button class="launcher-btn quick-preset" data-preset="t2-bugfix">
            <span class="name">🛠️ T2 Bugfix</span>
            <span class="desc">Bounded quick fix</span>
          </button>
          <button class="launcher-btn quick-preset" data-preset="nyquist-tests">
            <span class="name">🧪 Nyquist Tests</span>
            <span class="desc">Coverage diff sweep</span>
          </button>
          <button class="launcher-btn quick-preset" data-preset="rds-doctor">
            <span class="name">🩺 RDS Doctor</span>
            <span class="desc">Audit documentation</span>
          </button>
          <button class="launcher-btn quick-preset" data-preset="session-wrapup">
            <span class="name">📦 As-Built Wrapup</span>
            <span class="desc">Reconciliation loop</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Measure and notify height
  function notifyHeight() {
    const height = Math.min(Math.max(root.scrollHeight + 8, 120), 480);
    handlers.onTabChange?.(activeTab, height);
  }

  // Bind Tabs
  const navButtons = root.querySelectorAll<HTMLButtonElement>(".tab-btn");
  const panels: Record<CardTab, HTMLElement> = {
    monitor: root.querySelector("#panel-monitor")!,
    steering: root.querySelector("#panel-steering")!,
    launcher: root.querySelector("#panel-launcher")!,
  };

  navButtons.forEach((btn) => {
    btn.onclick = () => {
      const tab = btn.getAttribute("data-tab") as CardTab;
      if (tab === activeTab) return;
      activeTab = tab;

      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      Object.entries(panels).forEach(([name, panel]) => {
        if (name === tab) {
          panel.classList.remove("hidden");
        } else {
          panel.classList.add("hidden");
        }
      });

      notifyHeight();
    };
  });

  // Bind Refresh
  const btnRefresh = root.querySelector<HTMLButtonElement>("#btn-refresh")!;
  btnRefresh.onclick = () => {
    btnRefresh.classList.add("spinning");
    handlers.onRefresh();
    setTimeout(() => {
      btnRefresh.classList.remove("spinning");
    }, 600);
  };

  // Bind Concurrency Stepper
  const inputConcurrency = root.querySelector<HTMLInputElement>("#input-concurrency")!;
  const btnMinus = root.querySelector<HTMLButtonElement>("#btn-concurrency-minus")!;
  const btnPlus = root.querySelector<HTMLButtonElement>("#btn-concurrency-plus")!;

  btnMinus.onclick = () => {
    const val = Math.max(parseInt(inputConcurrency.value || "1", 10) - 1, 1);
    inputConcurrency.value = String(val);
  };

  btnPlus.onclick = () => {
    const val = Math.min(parseInt(inputConcurrency.value || "4", 10) + 1, 16);
    inputConcurrency.value = String(val);
  };

  // Bind Config Apply
  const btnApply = root.querySelector<HTMLButtonElement>("#btn-apply")!;
  btnApply.onclick = () => {
    const gearRaw = (root.querySelector("#select-gear") as HTMLSelectElement).value;
    const impactRaw = (root.querySelector("#select-impact") as HTMLSelectElement).value;
    const phaseRaw = (root.querySelector("#select-phase") as HTMLSelectElement).value;
    const concurrency = parseInt(inputConcurrency.value, 10);

    const isAuto = gearRaw === "AUTO" && impactRaw === "AUTO" && phaseRaw === "AUTO";

    handlers.onStageChange({
      gear: gearRaw === "AUTO" ? "AUTO" : (parseInt(gearRaw, 10) as GearTransmission),
      impact: impactRaw === "AUTO" ? "AUTO" : (impactRaw as ImpactClass),
      phase: phaseRaw === "AUTO" ? "AUTO" : (phaseRaw as CognitivePhase),
      concurrency: isNaN(concurrency) ? 4 : concurrency,
      mode: isAuto ? "AUTO" : "MANUAL",
    });
  };

  // Bind Reset Auto
  const btnResetAuto = root.querySelector<HTMLButtonElement>("#btn-reset-auto")!;
  btnResetAuto.onclick = () => {
    (root.querySelector("#select-gear") as HTMLSelectElement).value = "AUTO";
    (root.querySelector("#select-impact") as HTMLSelectElement).value = "AUTO";
    (root.querySelector("#select-phase") as HTMLSelectElement).value = "AUTO";
    inputConcurrency.value = "4";
    handlers.onResetAuto();
  };

  // Bind Emergency Hold
  const btnHold = root.querySelector<HTMLButtonElement>("#btn-hold")!;
  btnHold.onclick = () => {
    (root.querySelector("#select-gear") as HTMLSelectElement).value = "1";
    handlers.onStageChange({
      gear: 1,
      mode: "MANUAL",
    });
  };

  // Bind Launcher Archetypes
  root.querySelectorAll<HTMLButtonElement>(".launcher-btn[data-phase]").forEach((btn) => {
    btn.onclick = () => {
      const phase = btn.getAttribute("data-phase") as CognitivePhase;
      handlers.onLaunchSession(phase);
    };
  });

  // Bind Quick Presets
  root.querySelectorAll<HTMLButtonElement>(".quick-preset").forEach((btn) => {
    btn.onclick = () => {
      const preset = btn.getAttribute("data-preset");
      switch (preset) {
        case "t2-bugfix":
          handlers.onLaunchSession(
            "M3_EXECUTE",
            `[M3_EXECUTE / T2_SMALL_CHANGE / Gear 2]\nGoal: Implement bounded bugfix for [ISSUE_DESCRIPTION].\nDirectives: Worktree isolated, verify unit tests, push immediately to origin.`
          );
          break;
        case "nyquist-tests":
          handlers.onLaunchSession(
            "M3_EXECUTE",
            `[M3_EXECUTE / T2_SMALL_CHANGE / Gear 2]\nGoal: Run NYQUIST test gap audit and generate diff-driven tests for recent changes.\nDirectives: TDD Plan-Driven Testing & Diff-Driven Coverage Sweeps (DP-0005).`
          );
          break;
        case "rds-doctor":
          handlers.onLaunchSession(
            "M4_AUDIT",
            `[M4_AUDIT / T1_READ_ONLY_REPO / Gear 2]\nGoal: Run full repository document & fleet drift audit.\nDirectives: Execute rds doctor --fleet, rds drift, and rds validate.`
          );
          break;
        case "session-wrapup":
          handlers.onLaunchSession(
            "M4_AUDIT",
            `[M4_AUDIT / T2_SMALL_CHANGE / Gear 2]\nGoal: Execute session wrapup and as-built reconciliation protocol.\nDirectives: Session Wrapup Protocol & As-Built Reconciliation Loop (DP-0008).`
          );
          break;
      }
    };
  });

  return {
    getActiveTab(): CardTab {
      return activeTab;
    },
    update(doc: RDSMissionControlDoc | null, sessionContext?: { id: string | null; title?: string }) {
      if (!doc) return;

      // Update Session Chip
      const sessionChip = root.querySelector("#session-chip")!;
      if (sessionContext?.id) {
        const shortId = sessionContext.id.slice(0, 10);
        sessionChip.textContent = `#${shortId}`;
        sessionChip.setAttribute("title", `Session: ${sessionContext.title || sessionContext.id}`);
      } else {
        sessionChip.textContent = "#no-session";
        sessionChip.setAttribute("title", "No active session");
      }

      // Update Monitor Badges
      const phaseBadge = root.querySelector("#val-phase")!;
      const impactBadge = root.querySelector("#val-impact")!;
      const gearBadge = root.querySelector("#val-gear")!;
      const rdsBadge = root.querySelector("#val-rds")!;
      const branchBadge = root.querySelector("#val-branch")!;
      const contextBadge = root.querySelector("#val-context")!;

      phaseBadge.textContent = doc.active.phase;
      phaseBadge.className = `badge phase-${doc.active.phase.toLowerCase()}`;

      impactBadge.textContent = doc.active.impact.split("_")[0];
      impactBadge.className = `badge impact-${doc.active.impact.toLowerCase().split("_")[0]}`;

      const isDocAuto = doc.active.mode === "AUTO";
      gearBadge.textContent = `Gear ${doc.active.gear}${isDocAuto ? " [AUTO]" : ""}`;

      rdsBadge.textContent = doc.active.rdsStatus || "ENFORCED";
      branchBadge.textContent = doc.active.branch || "dev";
      if (doc.active.branch) {
        branchBadge.setAttribute("title", `Git Branch: ${doc.active.branch}`);
      }

      if (doc.active.contextTokens) {
        const { used, limit } = doc.active.contextTokens;
        const usedK = Math.round(used / 1000);
        const limitK = Math.round(limit / 1000);
        contextBadge.textContent = `${usedK}k / ${limitK}k`;
      } else {
        contextBadge.textContent = "-- / --";
      }

      // Update Activity
      const activitySpan = root.querySelector("#val-activity")!;
      const toolInfo = doc.active.activeTool ? `${doc.active.activeTool.name} ${doc.active.activeTool.target || ""}` : null;
      const detailText = doc.status.detail || doc.status.state || "Idle";
      activitySpan.textContent = toolInfo ? `⚡ ${toolInfo}` : detailText;
      activitySpan.setAttribute("title", detailText);

      // Update Actions Progress Bar
      const progressRatio = root.querySelector("#progress-ratio")!;
      const progressFill = root.querySelector<HTMLElement>("#progress-fill")!;
      if (doc.active.focusProgress && doc.active.focusProgress.total > 0) {
        const { done, total, percentage } = doc.active.focusProgress;
        progressRatio.textContent = `${done}/${total} done (${percentage}%)`;
        progressFill.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
        if (percentage >= 100) {
          progressFill.classList.add("green");
        } else {
          progressFill.classList.remove("green");
        }
      } else {
        progressRatio.textContent = "0/0 done";
        progressFill.style.width = "0%";
      }

      // Update Pending Staged Banner
      const pendingBanner = root.querySelector("#pending-banner")!;
      if (doc.pending && doc.pending.status === "PENDING_NEXT_TURN") {
        pendingBanner.classList.remove("hidden");
        const parts: string[] = [];
        if (doc.pending.mode) parts.push(`Mode: ${doc.pending.mode}`);
        if (doc.pending.phase) parts.push(`Phase: ${doc.pending.phase}`);
        if (doc.pending.impact) parts.push(`Impact: ${doc.pending.impact}`);
        if (doc.pending.gear) parts.push(`Gear: ${doc.pending.gear}`);
        if (doc.pending.concurrency) parts.push(`Workers: ${doc.pending.concurrency}`);
        root.querySelector("#pending-text")!.textContent = parts.join(", ");
      } else {
        pendingBanner.classList.add("hidden");
      }

      // Update Steering Mode Badge in Steering Tab
      const modeBadge = root.querySelector("#steering-mode-badge")!;
      if (isDocAuto) {
        modeBadge.textContent = "🤖 AUTO (Agent Decides)";
        modeBadge.className = "badge badge-mode-auto";
      } else {
        modeBadge.textContent = "👤 MANUAL (Operator Overridden)";
        modeBadge.className = "badge badge-mode-manual";
      }

      // Sync Steering Form if not currently focused by user
      if (document.activeElement?.tagName !== "SELECT" && document.activeElement?.tagName !== "INPUT") {
        const selectGear = root.querySelector<HTMLSelectElement>("#select-gear")!;
        const selectImpact = root.querySelector<HTMLSelectElement>("#select-impact")!;
        const selectPhase = root.querySelector<HTMLSelectElement>("#select-phase")!;

        if (isDocAuto) {
          selectGear.value = "AUTO";
          selectImpact.value = "AUTO";
          selectPhase.value = "AUTO";
        } else {
          selectGear.value = String(doc.active.gear);
          selectImpact.value = doc.active.impact;
          selectPhase.value = doc.active.phase;
        }

        inputConcurrency.value = String(doc.concurrency.local || doc.concurrency.global || 4);
      }

      notifyHeight();
    },
  };
}
