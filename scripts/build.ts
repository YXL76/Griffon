import { copyFile, rm } from "fs/promises";
import type { BuildOptions } from "esbuild";
import { build } from "esbuild";
import { pnpPlugin } from "@yarnpkg/esbuild-plugin-pnp";
import { resolve } from "path";

const prod = process.env["NODE_ENV"] === "production";

// TODO
const rootPath = resolve(process.cwd(), "..");
const distPath = resolve(rootPath, "dist");
const servicePath = resolve(rootPath, "service");
const windowPath = resolve(rootPath, "window");
const workerPath = resolve(rootPath, "worker");

const basicConfig: BuildOptions = {
  sourcemap: !prod,
  legalComments: "none",
  color: true,
  format: "esm",
  logLevel: "warning",
  target: "chrome99",
  minify: prod,

  bundle: true,
  splitting: true,
  outdir: distPath,
  platform: "browser",
  external: [
    /** {@link file://../deno-std/deno_std/node/_events.mjs:153:30} */
    "internal/event_target",
    /** {@link file://../deno-std/deno_std/node/internal/readline/interface.mjs:1190:27} */
    "stream"],
  loader: { ".ts": "ts", ".js": "js", ".cjs": "js", ".mjs": "js" },
  banner: { js: "'use strict';" },
  plugins: [pnpPlugin()],
};

(async () => {
  await rm(distPath, { force: true, recursive: true });

  await Promise.all([
    build({
      ...basicConfig,
      entryPoints: {
        service: resolve(servicePath, "index.ts"),
        window: resolve(windowPath, "index.ts"),
        worker: resolve(workerPath, "index.ts"),
      },
    }),
  ]);

  await copyFile(resolve("index.html"), resolve(distPath, "index.html"));
})().catch(console.error);
