import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  EXTENSION_ID,
  REQUIRED_CAPABILITIES,
  REQUIRED_SCOPES,
  DEFAULT_STORAGE_ID,
  loadExtensionsConfig,
  saveExtensionsConfig,
  registerExtensionInConfig,
  unregisterExtensionFromConfig,
  runDoctorDiagnostics,
  getOpenChamberConfigDir,
  getExtensionsJsonPath,
  getMissionControlDataDir
} from "../scripts/installer.mjs";

describe("installer configuration reconciliation", () => {
  it("loads default config structure when file does not exist", () => {
    const fakePath = path.join(os.tmpdir(), `nonexistent-ext-${Date.now()}.json`);
    const cfg = loadExtensionsConfig(fakePath);
    assert.deepEqual(cfg.paths, []);
    assert.deepEqual(cfg.capabilityGrants, {});
    assert.deepEqual(cfg.capabilityScopes, {});
    assert.deepEqual(cfg.storageIds, {});
  });

  it("registers extension into empty config cleanly", () => {
    const emptyConfig = {
      paths: [],
      sources: {},
      gitOrigins: {},
      capabilityGrants: {},
      capabilityScopes: {},
      storageIds: {}
    };

    const target = "/opt/extensions/openchamber-rds-mission-control";
    const updated = registerExtensionInConfig(target, emptyConfig);

    assert.ok(updated.paths.includes(target));
    assert.deepEqual(updated.capabilityGrants[EXTENSION_ID], REQUIRED_CAPABILITIES);
    assert.deepEqual(updated.capabilityScopes[EXTENSION_ID], REQUIRED_SCOPES);
    assert.equal(updated.storageIds[EXTENSION_ID], DEFAULT_STORAGE_ID);
  });

  it("is idempotent when registering extension multiple times", () => {
    const initial = {
      paths: ["/existing/path"],
      sources: {},
      gitOrigins: {},
      capabilityGrants: { [EXTENSION_ID]: ["prompt"] },
      capabilityScopes: {},
      storageIds: { [EXTENSION_ID]: "custom-uuid-123" }
    };

    const target = "/opt/extensions/openchamber-rds-mission-control";
    const firstPass = registerExtensionInConfig(target, initial);
    assert.equal(firstPass.paths.length, 2);
    assert.equal(firstPass.storageIds[EXTENSION_ID], "custom-uuid-123"); // Preserves existing UUID

    const secondPass = registerExtensionInConfig(target, firstPass);
    assert.equal(secondPass.paths.length, 2); // No duplicates
    assert.equal(secondPass.capabilityGrants[EXTENSION_ID].length, REQUIRED_CAPABILITIES.length);
  });

  it("unregisters extension cleanly without affecting others", () => {
    const config = {
      paths: [
        "/other/ext-a",
        "/opt/extensions/openchamber-rds-mission-control",
        "/other/ext-b"
      ],
      sources: {
        "/opt/extensions/openchamber-rds-mission-control": "git"
      },
      gitOrigins: {
        "/opt/extensions/openchamber-rds-mission-control": { url: "https://example.com" }
      },
      capabilityGrants: {
        [EXTENSION_ID]: REQUIRED_CAPABILITIES,
        "other-ext": ["files"]
      },
      capabilityScopes: {
        [EXTENSION_ID]: REQUIRED_SCOPES
      },
      storageIds: {
        [EXTENSION_ID]: "uuid-1"
      }
    };

    const target = "/opt/extensions/openchamber-rds-mission-control";
    const updated = unregisterExtensionFromConfig(target, config, false);

    assert.equal(updated.paths.length, 2);
    assert.ok(!updated.paths.includes(target));
    assert.ok(!updated.sources[target]);
    assert.ok(!updated.gitOrigins[target]);
    // Grants preserved when pruneCapabilities is false
    assert.ok(updated.capabilityGrants[EXTENSION_ID]);

    const pruned = unregisterExtensionFromConfig(target, config, true);
    assert.ok(!pruned.capabilityGrants[EXTENSION_ID]);
    assert.ok(!pruned.capabilityScopes[EXTENSION_ID]);
  });

  it("atomically saves and reloads config from disk", () => {
    const tmpFile = path.join(os.tmpdir(), `test-extensions-${Date.now()}.json`);
    try {
      const initial = {
        paths: ["/path/test"],
        sources: {},
        gitOrigins: {},
        capabilityGrants: {},
        capabilityScopes: {},
        storageIds: {}
      };
      saveExtensionsConfig(initial, tmpFile);

      assert.ok(fs.existsSync(tmpFile));
      const loaded = loadExtensionsConfig(tmpFile);
      assert.deepEqual(loaded.paths, ["/path/test"]);
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  });
});

describe("doctor and diagnostics", () => {
  it("verifies Node.js version and core runtime checks", () => {
    const report = runDoctorDiagnostics();
    assert.ok(Array.isArray(report.checks));
    assert.ok(report.checks.length >= 7);

    const nodeCheck = report.checks.find(c => c.name.includes("Node.js"));
    assert.ok(nodeCheck);
    assert.equal(nodeCheck.pass, true);

    const npmCheck = report.checks.find(c => c.name.includes("npm"));
    assert.ok(npmCheck);
    assert.equal(npmCheck.pass, true);

    const dataDirCheck = report.checks.find(c => c.name.includes("Storage Directory"));
    assert.ok(dataDirCheck);
    assert.equal(dataDirCheck.pass, true);
  });
});

describe("path helpers", () => {
  it("resolves valid path strings for OpenChamber", () => {
    const configDir = getOpenChamberConfigDir();
    assert.ok(typeof configDir === "string" && configDir.length > 0);

    const extJson = getExtensionsJsonPath();
    assert.ok(extJson.endsWith("extensions.json"));

    const dataDir = getMissionControlDataDir();
    assert.ok(dataDir.endsWith("rds-mission-control"));
  });
});
