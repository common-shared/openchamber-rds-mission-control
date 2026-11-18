/**
 * RDS Mission Control Card
 * 
 * Renders the 3-section Mission Control panel.
 */

import {
  type RDSMissionControlDoc,
  type CognitivePhase,
  type ImpactClass,
  type GearTransmission
} from "../shared/store.ts";

export interface CardHandlers {
  onStageChange(update: Partial<{ phase: CognitivePhase; impact: ImpactClass; gear: GearTransmission; concurrency: number }>): void;
  onLaunchSession(phase: CognitivePhase): void;
}

export function createCard(root: HTMLElement, handlers: CardHandlers) {
  root.innerHTML = `
    <div id="rds-monitor" class="section">
      <div class="section-header">📡 MONITORING (READ-ONLY)</div>
      <div class="telemetry-grid">
        <div class="telemetry-item">
          <label>PHASE</label>
          <div id="val-phase" class="badge">---</div>
        </div>
        <div class="telemetry-item">
          <label>IMPACT</label>
          <div id="val-impact" class="badge">---</div>
        </div>
        <div class="telemetry-item">
          <label>GEAR</label>
          <div id="val-gear" class="badge">---</div>
        </div>
      </div>
      <div id="pending-banner" class="pending-banner hidden">
        ⚠️ STAGED: <span id="pending-text"></span> (Applied next turn)
      </div>
      <div class="status-row">
        <label>STATUS:</label>
        <span id="val-status">Idle</span>
      </div>
    </div>

    <div id="rds-config" class="section">
      <div class="section-header">⚙️ CONFIGURATION (STEERING)</div>
      <div class="config-grid">
        <div class="config-item">
          <label>GEAR</label>
          <select id="select-gear">
            <option value="1">Gear 1: Manual</option>
            <option value="2">Gear 2: Interactive</option>
            <option value="3" selected>Gear 3: Supervised</option>
            <option value="4">Gear 4: Headless</option>
          </select>
        </div>
        <div class="config-item">
          <label>IMPACT</label>
          <select id="select-impact">
            <option value="T0_INFORMATIONAL">T0: Info</option>
            <option value="T1_READ_ONLY_REPO">T1: Read-Only</option>
            <option value="T2_SMALL_CHANGE">T2: Small Fix</option>
            <option value="T3_FEATURE_CHANGE" selected>T3: Feature</option>
            <option value="T4_MULTI_PHASE">T4: Programme</option>
            <option value="T5_OPERATIONAL_SENSITIVE">T5: Sensitive</option>
          </select>
        </div>
        <div class="config-item">
          <label>PARALLEL</label>
          <input type="number" id="input-concurrency" min="1" max="16" value="4">
        </div>
      </div>
      <button id="btn-apply" class="primary-btn">Stage Changes for Next Turn</button>
    </div>

    <div id="rds-launcher" class="section">
      <div class="section-header">🚀 SESSION LAUNCHER (STAGING)</div>
      <div class="launcher-grid">
        <button class="launcher-btn" data-phase="M0_EXPLORE">🧠 M0_EXPLORE</button>
        <button class="launcher-btn" data-phase="M1_PROPOSE">📝 M1_PROPOSE</button>
        <button class="launcher-btn" data-phase="M3_EXECUTE">⚡ M3_EXECUTE</button>
        <button class="launcher-btn" data-phase="M4_AUDIT">🔍 M4_AUDIT</button>
      </div>
    </div>
  `;

  // Bind Config Apply
  const btnApply = root.querySelector("#btn-apply") as HTMLButtonElement;
  btnApply.onclick = () => {
    const gear = parseInt((root.querySelector("#select-gear") as HTMLSelectElement).value) as GearTransmission;
    const impact = (root.querySelector("#select-impact") as HTMLSelectElement).value as ImpactClass;
    const concurrency = parseInt((root.querySelector("#input-concurrency") as HTMLInputElement).value);
    
    handlers.onStageChange({ gear, impact, concurrency });
  };

  // Bind Launcher
  root.querySelectorAll(".launcher-btn").forEach(btn => {
    (btn as HTMLButtonElement).onclick = () => {
      const phase = btn.getAttribute("data-phase") as CognitivePhase;
      handlers.onLaunchSession(phase);
    };
  });

  return {
    update(doc: RDSMissionControlDoc | null) {
      if (!doc) return;

      // Update Monitor
      root.querySelector("#val-phase")!.textContent = doc.active.phase;
      root.querySelector("#val-impact")!.textContent = doc.active.impact.split("_")[0];
      root.querySelector("#val-gear")!.textContent = `Gear ${doc.active.gear}`;
      root.querySelector("#val-status")!.textContent = doc.status.detail || doc.status.state;

      // Update Badges
      root.querySelector("#val-phase")!.className = `badge phase-${doc.active.phase.toLowerCase()}`;
      root.querySelector("#val-impact")!.className = `badge impact-${doc.active.impact.toLowerCase().split("_")[0]}`;

      // Update Pending
      const pendingBanner = root.querySelector("#pending-banner")!;
      if (doc.pending && Object.keys(doc.pending).length > 0) {
        pendingBanner.classList.remove("hidden");
        const parts = [];
        if (doc.pending.phase) parts.push(`Phase: ${doc.pending.phase}`);
        if (doc.pending.impact) parts.push(`Impact: ${doc.pending.impact}`);
        if (doc.pending.gear) parts.push(`Gear: ${doc.pending.gear}`);
        root.querySelector("#pending-text")!.textContent = parts.join(", ");
      } else {
        pendingBanner.classList.add("hidden");
      }

      // Sync form if not focused
      if (document.activeElement?.tagName !== "SELECT" && document.activeElement?.tagName !== "INPUT") {
        (root.querySelector("#select-gear") as HTMLSelectElement).value = String(doc.active.gear);
        (root.querySelector("#select-impact") as HTMLSelectElement).value = doc.active.impact;
        (root.querySelector("#input-concurrency") as HTMLInputElement).value = String(doc.concurrency.local || doc.concurrency.global);
      }
    }
  };
}

export function el(tag: string, className?: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}
