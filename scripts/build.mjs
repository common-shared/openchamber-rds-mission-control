import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

console.log("Building OpenChamber extension for RDS Mission Control...");

await build({
  entryPoints: [path.join(root, "status/main.ts")],
  outfile: path.join(root, "status/main.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome110", "safari16", "firefox110"],
  minify: false,
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
  banner: { js: "/* Built from status/main.ts */" },
});

console.log("Build complete: status/main.js generated.");
