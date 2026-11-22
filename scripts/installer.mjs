#!/usr/bin/env node

/**
 * openchamber-rds-mission-control - Deterministic Lifecycle & Installation Engine
 *
 * Provides robust, idempotent, clean-from-scratch install, update, remove,
 * doctor (health diagnostics), run, and release verification commands.
 * Compatible with human operators, AI agents, and raw Linux servers.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, "..");

export const EXTENSION_ID = "rds-mission-control";
export const REQUIRED_CAPABILITIES = ["prompt", "sessions", "files", "model", "filesystem"];
export const REQUIRED_SCOPES = {
  filesystem: ["/tmp/opencode/**", "~/.openchamber/**"]
};
export const DEFAULT_STORAGE_ID = "d4abd8c2-4af9-47c0-9857-7cb202effc7e";

/**
 * Resolves OpenChamber configuration directory.
 * Priority: $OPENCHAMBER_DATA_DIR -> ~/.config/openchamber -> ~/.openchamber
 */
export function getOpenChamberConfigDir() {
  if (process.env.OPENCHAMBER_DATA_DIR) {
    return path.resolve(process.env.OPENCHAMBER_DATA_DIR);
  }
  const configDir = path.join(os.homedir(), ".config", "openchamber");
  if (fs.existsSync(configDir)) {
    return configDir;
  }
  const dotDir = path.join(os.homedir(), ".openchamber");
  if (fs.existsSync(dotDir)) {
    return dotDir;
  }
  return configDir;
}

export function getExtensionsJsonPath() {
  return path.join(getOpenChamberConfigDir(), "extensions.json");
}

export function getMissionControlDataDir() {
  return path.join(os.homedir(), ".openchamber", "rds-mission-control");
}

/**
 * Loads and parses extensions.json cleanly with schema fallbacks.
 */
export function loadExtensionsConfig(filePath = getExtensionsJsonPath()) {
  if (!fs.existsSync(filePath)) {
    return {
      paths: [],
      sources: {},
      gitOrigins: {},
      capabilityGrants: {},
      capabilityScopes: {},
      storageIds: {}
    };
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      paths: Array.isArray(parsed.paths) ? parsed.paths : [],
      sources: parsed.sources && typeof parsed.sources === "object" ? parsed.sources : {},
      gitOrigins: parsed.gitOrigins && typeof parsed.gitOrigins === "object" ? parsed.gitOrigins : {},
      capabilityGrants: parsed.capabilityGrants && typeof parsed.capabilityGrants === "object" ? parsed.capabilityGrants : {},
      capabilityScopes: parsed.capabilityScopes && typeof parsed.capabilityScopes === "object" ? parsed.capabilityScopes : {},
      storageIds: parsed.storageIds && typeof parsed.storageIds === "object" ? parsed.storageIds : {}
    };
  } catch (err) {
    throw new Error(`Failed to read extensions.json at ${filePath}: ${err.message}`);
  }
}

/**
 * Atomically saves extensions.json.
 */
export function saveExtensionsConfig(config, filePath = getExtensionsJsonPath()) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2) + "\n", "utf8");
  fs.renameSync(tmpPath, filePath);
}

/**
 * Reconciles OpenChamber extensions.json to ensure the extension is registered,
 * granted required capabilities, scoped, and assigned storage ID.
 */
export function registerExtensionInConfig(extensionPath, config = null) {
  const resolvedPath = path.resolve(extensionPath);
  const currentConfig = config || loadExtensionsConfig();

  // 1. Paths array
  if (!currentConfig.paths.includes(resolvedPath)) {
    currentConfig.paths.push(resolvedPath);
  }

  // 2. Capability Grants
  const existingGrants = currentConfig.capabilityGrants[EXTENSION_ID] || [];
  const mergedGrants = Array.from(new Set([...existingGrants, ...REQUIRED_CAPABILITIES]));
  currentConfig.capabilityGrants[EXTENSION_ID] = mergedGrants;

  // 3. Capability Scopes
  currentConfig.capabilityScopes[EXTENSION_ID] = {
    ...currentConfig.capabilityScopes[EXTENSION_ID],
    ...REQUIRED_SCOPES
  };

  // 4. Storage ID
  if (!currentConfig.storageIds[EXTENSION_ID]) {
    currentConfig.storageIds[EXTENSION_ID] = DEFAULT_STORAGE_ID;
  }

  return currentConfig;
}

/**
 * Removes the extension from OpenChamber extensions.json.
 */
export function unregisterExtensionFromConfig(extensionPath, config = null, pruneCapabilities = false) {
  const resolvedPath = path.resolve(extensionPath);
  const currentConfig = config || loadExtensionsConfig();

  currentConfig.paths = currentConfig.paths.filter(p => path.resolve(p) !== resolvedPath);
  if (currentConfig.sources && currentConfig.sources[resolvedPath]) {
    delete currentConfig.sources[resolvedPath];
  }
  if (currentConfig.gitOrigins && currentConfig.gitOrigins[resolvedPath]) {
    delete currentConfig.gitOrigins[resolvedPath];
  }

  if (pruneCapabilities) {
    delete currentConfig.capabilityGrants[EXTENSION_ID];
    delete currentConfig.capabilityScopes[EXTENSION_ID];
  }

  return currentConfig;
}

/**
 * Clean build from scratch:
 * Removes stale build bundle, installs dependencies, builds bundle.
 */
export function cleanBuild(rootDir = REPO_ROOT, options = {}) {
  const log = options.quiet ? () => {} : console.log;
  log(`[BUILD] Initiating clean-from-scratch build in ${rootDir}...`);

  const mainJsPath = path.join(rootDir, "status", "main.js");
  if (fs.existsSync(mainJsPath)) {
    log(`[BUILD] Removing previous bundle: ${mainJsPath}`);
    fs.unlinkSync(mainJsPath);
  }

  if (options.cleanDeps) {
    const nodeModulesPath = path.join(rootDir, "node_modules");
    if (fs.existsSync(nodeModulesPath)) {
      log(`[BUILD] Removing stale node_modules for clean install...`);
      fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    }
  }

  // Ensure dependencies are installed
  if (!fs.existsSync(path.join(rootDir, "node_modules", "esbuild"))) {
    log(`[BUILD] Installing dependencies (npm install)...`);
    execSync("npm install", { cwd: rootDir, stdio: options.quiet ? "ignore" : "inherit" });
  }

  // Typecheck
  if (!options.skipTypecheck) {
    log(`[BUILD] Running TypeScript typecheck...`);
    execSync("npm run typecheck", { cwd: rootDir, stdio: options.quiet ? "ignore" : "inherit" });
  }

  // Run build
  log(`[BUILD] Compiling web bundle via esbuild...`);
  execSync("npm run build", { cwd: rootDir, stdio: options.quiet ? "ignore" : "inherit" });

  if (!fs.existsSync(mainJsPath)) {
    throw new Error(`Build failed: ${mainJsPath} was not generated!`);
  }

  const stat = fs.statSync(mainJsPath);
  log(`[BUILD] Clean build successful! Generated ${mainJsPath} (${(stat.size / 1024).toFixed(1)} KB)`);
  return mainJsPath;
}

/**
 * Checks runtime environment and returns diagnostics report.
 */
export function runDoctorDiagnostics(targetPath = REPO_ROOT) {
  const resolvedTarget = path.resolve(targetPath);
  const checks = [];

  // 1. Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.replace(/^v/, "").split(".")[0], 10);
  checks.push({
    name: "Node.js Version (>= 20.0.0)",
    pass: major >= 20,
    details: `${nodeVersion} detected (required: >= v20.0.0)`
  });

  // 2. npm executable
  let npmVersion = "missing";
  let npmPass = false;
  try {
    npmVersion = execSync("npm -v", { encoding: "utf8" }).trim();
    npmPass = true;
  } catch {}
  checks.push({
    name: "npm Package Manager",
    pass: npmPass,
    details: npmPass ? `npm v${npmVersion} available` : "npm not found in PATH"
  });

  // 3. OpenChamber CLI binary
  let ocPath = null;
  try {
    ocPath = execSync("which openchamber", { encoding: "utf8" }).trim();
  } catch {}
  checks.push({
    name: "OpenChamber CLI Binary",
    pass: !!ocPath,
    details: ocPath ? `Found at ${ocPath}` : "openchamber not found in PATH (install via 'npm install -g openchamber')"
  });

  // 4. OpenChamber running process
  let ocRunning = false;
  let ocStatusDetail = "Not running";
  if (ocPath) {
    try {
      const statusOut = execSync("openchamber status", { encoding: "utf8", timeout: 3000 });
      if (statusOut.includes("running runtime")) {
        ocRunning = true;
        const portMatch = statusOut.match(/port\s+(\d+)/);
        ocStatusDetail = `Active daemon on port ${portMatch ? portMatch[1] : "unknown"}`;
      }
    } catch {}
  }
  checks.push({
    name: "OpenChamber Daemon Status",
    pass: ocRunning,
    warnOnly: true,
    details: ocStatusDetail
  });

  // 5. Target extension build artifacts
  const mainJs = path.join(resolvedTarget, "status", "main.js");
  const indexHtml = path.join(resolvedTarget, "status", "index.html");
  const hasBundle = fs.existsSync(mainJs) && fs.statSync(mainJs).size > 1000;
  const hasHtml = fs.existsSync(indexHtml);
  checks.push({
    name: "Extension Web Assets (status/main.js & index.html)",
    pass: hasBundle && hasHtml,
    details: hasBundle ? `Built bundle: ${(fs.statSync(mainJs).size / 1024).toFixed(1)} KB` : "Assets missing or empty (run build)"
  });

  // 6. extensions.json registration & grants
  const extConfigPath = getExtensionsJsonPath();
  let registered = false;
  let grantsPass = false;
  let scopesPass = false;
  let regDetails = "Not registered";

  if (fs.existsSync(extConfigPath)) {
    try {
      const cfg = loadExtensionsConfig(extConfigPath);
      registered = cfg.paths.some(p => path.resolve(p) === resolvedTarget);
      const grants = cfg.capabilityGrants[EXTENSION_ID] || [];
      grantsPass = REQUIRED_CAPABILITIES.every(c => grants.includes(c));
      const scopes = cfg.capabilityScopes[EXTENSION_ID]?.filesystem || [];
      scopesPass = REQUIRED_SCOPES.filesystem.every(s => scopes.includes(s));
      regDetails = registered
        ? `Registered in ${extConfigPath} with ${grants.length} capability grants`
        : `extensions.json exists, but ${resolvedTarget} not in paths`;
    } catch (e) {
      regDetails = `Error reading extensions.json: ${e.message}`;
    }
  } else {
    regDetails = `File not found: ${extConfigPath}`;
  }

  checks.push({
    name: "OpenChamber extensions.json Registration",
    pass: registered,
    details: regDetails
  });

  checks.push({
    name: "Capability Grants (prompt, sessions, files, model, filesystem)",
    pass: grantsPass,
    details: grantsPass ? "All 5 required capabilities granted" : "Missing required capability grants"
  });

  checks.push({
    name: "Filesystem Capability Scopes (/tmp/opencode/**, ~/.openchamber/**)",
    pass: scopesPass,
    details: scopesPass ? "Filesystem scopes configured" : "Filesystem scopes missing or incomplete"
  });

  // 7. Mission Control writable state directory
  const dataDir = getMissionControlDataDir();
  let dataDirPass = false;
  let dataDirDetail = "";
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
    }
    const testFile = path.join(dataDir, `.write-test-${Date.now()}`);
    fs.writeFileSync(testFile, "ok", "utf8");
    fs.unlinkSync(testFile);
    dataDirPass = true;
    dataDirDetail = `Writable at ${dataDir}`;
  } catch (err) {
    dataDirDetail = `Failed writing to ${dataDir}: ${err.message}`;
  }

  checks.push({
    name: "Telemetry & Steering Storage Directory",
    pass: dataDirPass,
    details: dataDirDetail
  });

  return {
    targetPath: resolvedTarget,
    checks,
    allPassed: checks.every(c => c.pass || c.warnOnly)
  };
}

/**
 * Executes installation of the extension into OpenChamber.
 */
export async function installExtension(options = {}) {
  const log = options.quiet ? () => {} : console.log;
  const targetPath = options.target ? path.resolve(options.target) : REPO_ROOT;

  log("\n=====================================================================");
  log("  RDS MISSION CONTROL — OPENCHAMBER EXTENSION INSTALLER");
  log("=====================================================================\n");
  log(`[INSTALL] Target directory: ${targetPath}`);

  // 1. Ensure target directory contains package.json
  const pkgPath = path.join(targetPath, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`Target directory ${targetPath} does not contain package.json!`);
  }

  // 2. Perform clean build from scratch
  cleanBuild(targetPath, {
    cleanDeps: !!options.clean,
    quiet: options.quiet
  });

  // 3. Ensure Mission Control data directory exists
  const dataDir = getMissionControlDataDir();
  if (!fs.existsSync(dataDir)) {
    log(`[INSTALL] Initializing storage directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
  }

  // 4. Update OpenChamber extensions.json
  const extConfigPath = getExtensionsJsonPath();
  log(`[INSTALL] Reconciling configuration: ${extConfigPath}`);
  const config = loadExtensionsConfig(extConfigPath);
  const updatedConfig = registerExtensionInConfig(targetPath, config);
  saveExtensionsConfig(updatedConfig, extConfigPath);
  log(`[INSTALL] Successfully registered ${EXTENSION_ID} with capability grants and filesystem scopes.`);

  // 5. Restart or reload OpenChamber daemon if running and requested
  if (!options.noRestart) {
    try {
      const statusOut = execSync("openchamber status", { encoding: "utf8", timeout: 3000 });
      if (statusOut.includes("running runtime")) {
        log(`[INSTALL] Detected running OpenChamber daemon. Restarting to load new extension...`);
        execSync("openchamber restart", { stdio: options.quiet ? "ignore" : "inherit" });
        log(`[INSTALL] OpenChamber daemon restarted successfully.`);
      }
    } catch {}
  }

  // 6. Run doctor diagnostics
  log("\n[INSTALL] Running post-install health verification...");
  const report = runDoctorDiagnostics(targetPath);
  printDoctorReport(report, log);

  if (!report.allPassed) {
    throw new Error("Installation completed with failing health checks. See doctor report above.");
  }

  log("\n[SUCCESS] RDS Mission Control extension is installed, enabled, and healthy!\n");
  return report;
}

/**
 * Updates the extension cleanly from scratch.
 */
export async function updateExtension(options = {}) {
  const log = options.quiet ? () => {} : console.log;
  const targetPath = options.target ? path.resolve(options.target) : REPO_ROOT;

  log("\n=====================================================================");
  log("  RDS MISSION CONTROL — EXTENSION UPDATE (CLEAN SCRATCH)");
  log("=====================================================================\n");
  log(`[UPDATE] Target directory: ${targetPath}`);

  // If git repository, pull latest changes
  if (fs.existsSync(path.join(targetPath, ".git")) && !options.noPull) {
    try {
      log(`[UPDATE] Checking git upstream for updates...`);
      execSync("git pull --ff-only", { cwd: targetPath, stdio: options.quiet ? "ignore" : "inherit" });
    } catch (e) {
      log(`[UPDATE] Notice: git pull skipped or not on tracked branch (${e.message})`);
    }
  }

  return installExtension({
    ...options,
    target: targetPath,
    clean: true
  });
}

/**
 * Removes / unregisters the extension from OpenChamber.
 */
export async function removeExtension(options = {}) {
  const log = options.quiet ? () => {} : console.log;
  const targetPath = options.target ? path.resolve(options.target) : REPO_ROOT;
  const extConfigPath = getExtensionsJsonPath();

  log("\n=====================================================================");
  log("  RDS MISSION CONTROL — EXTENSION REMOVAL / UNINSTALL");
  log("=====================================================================\n");
  log(`[REMOVE] Unregistering: ${targetPath}`);

  if (!fs.existsSync(extConfigPath)) {
    log(`[REMOVE] extensions.json not found at ${extConfigPath}. Nothing to unregister.`);
    return;
  }

  const config = loadExtensionsConfig(extConfigPath);
  const updatedConfig = unregisterExtensionFromConfig(targetPath, config, options.pruneCapabilities);
  saveExtensionsConfig(updatedConfig, extConfigPath);
  log(`[REMOVE] Removed ${targetPath} from ${extConfigPath}`);

  if (options.purge) {
    const dataDir = getMissionControlDataDir();
    if (fs.existsSync(dataDir)) {
      log(`[REMOVE] Purging data directory: ${dataDir}`);
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  }

  if (!options.noRestart) {
    try {
      const statusOut = execSync("openchamber status", { encoding: "utf8", timeout: 3000 });
      if (statusOut.includes("running runtime")) {
        log(`[REMOVE] Restarting OpenChamber daemon to apply changes...`);
        execSync("openchamber restart", { stdio: options.quiet ? "ignore" : "inherit" });
      }
    } catch {}
  }

  log("\n[SUCCESS] RDS Mission Control uninstalled successfully.\n");
}

/**
 * Runs release verification invariant.
 * Strict protocol executed prior to tagging and publishing any release.
 */
export async function verifyRelease(options = {}) {
  const log = options.quiet ? () => {} : console.log;
  const rootDir = REPO_ROOT;

  log("\n=====================================================================");
  log("  RDS MISSION CONTROL — STRICT RELEASE VERIFICATION INVARIANT");
  log("=====================================================================\n");

  // Step 1: Clean build from scratch
  log("[STEP 1/5] Clean build from scratch...");
  cleanBuild(rootDir, { cleanDeps: false, quiet: options.quiet });

  // Step 2: Automated test suite
  log("\n[STEP 2/5] Running automated test suites...");
  execSync("npm test", { cwd: rootDir, stdio: "inherit" });

  // Step 3: Combined check (typecheck + build + test)
  log("\n[STEP 3/5] Running full verification check (typecheck, build, test)...");
  execSync("npm run check", { cwd: rootDir, stdio: "inherit" });

  // Step 4: Health and OpenChamber registration check
  log("\n[STEP 4/5] Running doctor diagnostics...");
  const report = runDoctorDiagnostics(rootDir);
  printDoctorReport(report, log);

  const hardFailures = report.checks.filter(c => !c.pass && !c.warnOnly);
  if (hardFailures.length > 0) {
    throw new Error(`Release verification failed: ${hardFailures.length} hard check(s) failed in doctor.`);
  }

  // Step 5: Central RDS documentation validation
  log("\n[STEP 5/5] Validating enduring documentation via RDS toolchain...");
  const rdsPython = "/home/pbruser/.local/venvs/eval-harness/bin/python";
  const rdsScript = "/home/pbruser/workspace/repos/common/rds/scripts/rds.py";
  if (fs.existsSync(rdsPython) && fs.existsSync(rdsScript)) {
    execSync(`${rdsPython} ${rdsScript} validate`, { cwd: rootDir, stdio: "inherit" });
  } else {
    log("[STEP 5/5] Notice: Central RDS validate toolchain not present at standard path; skipping RDS validation step.");
  }

  log("\n=====================================================================");
  log("  [VERIFIED] ALL RELEASE VERIFICATION GATES PASSED CLEANLY!");
  log("=====================================================================\n");
  return true;
}

/**
 * Helper to pretty-print doctor report
 */
export function printDoctorReport(report, log = console.log) {
  log(`\n  Diagnostic Target: ${report.targetPath}`);
  log("  " + "-".repeat(65));
  for (const c of report.checks) {
    let icon = c.pass ? "\x1b[32m[PASS]\x1b[0m" : (c.warnOnly ? "\x1b[33m[WARN]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m");
    log(`  ${icon} ${c.name}`);
    log(`         ${c.details}`);
  }
  log("  " + "-".repeat(65));
  if (report.allPassed) {
    log("  Status: \x1b[32mHEALTHY\x1b[0m (all checks passed or acceptable warnings)\n");
  } else {
    log("  Status: \x1b[31mDEGRADED\x1b[0m (one or more critical checks failed)\n");
  }
}

/**
 * Helper to start or ensure OpenChamber daemon is running.
 */
export function runOrEnableOpenChamber(options = {}) {
  const log = options.quiet ? () => {} : console.log;
  let ocPath = null;
  try {
    ocPath = execSync("which openchamber", { encoding: "utf8" }).trim();
  } catch {}

  if (!ocPath) {
    throw new Error("OpenChamber is not installed. Install via: npm install -g openchamber");
  }

  try {
    const statusOut = execSync("openchamber status", { encoding: "utf8", timeout: 3000 });
    if (statusOut.includes("running runtime")) {
      log("[RUN] OpenChamber is already running. Triggering restart to ensure latest assets...");
      execSync("openchamber restart", { stdio: "inherit" });
      log("[RUN] OpenChamber restarted successfully.");
      return;
    }
  } catch {}

  log("[RUN] Starting OpenChamber daemon...");
  execSync("openchamber serve --daemon", { stdio: "inherit" });
  log("[RUN] OpenChamber started.");
}

/**
 * CLI Argument Dispatcher
 */
export async function main(argv = process.argv.slice(2)) {
  const command = argv[0] || "help";
  const args = argv.slice(1);

  const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--")) {
      return args[idx + 1];
    }
    return null;
  };
  const hasFlag = (name) => args.includes(`--${name}`);

  try {
    switch (command) {
      case "install": {
        await installExtension({
          target: getArg("target") || REPO_ROOT,
          clean: hasFlag("clean"),
          noRestart: hasFlag("no-restart"),
          quiet: hasFlag("quiet")
        });
        break;
      }
      case "update": {
        await updateExtension({
          target: getArg("target") || REPO_ROOT,
          noPull: hasFlag("no-pull"),
          noRestart: hasFlag("no-restart"),
          quiet: hasFlag("quiet")
        });
        break;
      }
      case "remove":
      case "uninstall": {
        await removeExtension({
          target: getArg("target") || REPO_ROOT,
          purge: hasFlag("purge"),
          pruneCapabilities: hasFlag("prune-capabilities"),
          noRestart: hasFlag("no-restart"),
          quiet: hasFlag("quiet")
        });
        break;
      }
      case "doctor":
      case "status": {
        const report = runDoctorDiagnostics(getArg("target") || REPO_ROOT);
        printDoctorReport(report, console.log);
        if (!report.allPassed) {
          process.exitCode = 1;
        }
        break;
      }
      case "run":
      case "enable": {
        runOrEnableOpenChamber({ quiet: hasFlag("quiet") });
        break;
      }
      case "verify-release": {
        await verifyRelease({ quiet: hasFlag("quiet") });
        break;
      }
      case "help":
      case "--help":
      case "-h":
      default: {
        console.log(`
OpenChamber RDS Mission Control — Lifecycle Management CLI

USAGE:
  node scripts/installer.mjs <command> [options]
  openchamber-rds-mission-control <command> [options]

COMMANDS:
  install           Clean-from-scratch installation and registration in OpenChamber
  update            Clean-from-scratch update (git pull + clean build + re-register)
  remove            Unregister extension from OpenChamber configuration
  doctor            Comprehensive environment and extension health diagnostics
  run               Start or restart OpenChamber daemon with Mission Control enabled
  verify-release    Run full clean build, test suite, and RDS release verification gate
  help              Display this help menu

OPTIONS:
  --clean           Wipe previous build assets and node_modules for clean install
  --target <dir>    Specify custom extension target path (defaults to repo root)
  --no-restart      Do not restart running OpenChamber daemon
  --purge           Purge telemetry data directory on removal
  --quiet           Suppress non-error output

EXAMPLES:
  node scripts/installer.mjs install --clean
  node scripts/installer.mjs doctor
  node scripts/installer.mjs verify-release
        `);
        break;
      }
    }
  } catch (err) {
    console.error(`\n\x1b[31m[ERROR]\x1b[0m ${err.message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] === __filename) {
  main();
}
