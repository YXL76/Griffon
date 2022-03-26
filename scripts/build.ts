import { copyFile, rm } from "fs/promises";
import type { BuildOptions } from "esbuild";
import { build } from "esbuild";
import { pnpPlugin } from "@yarnpkg/esbuild-plugin-pnp";
import { resolve } from "path";

const prod = process.env["NODE_ENV"] === "production";

// TODO
const rootPath = resolve(process.cwd(), "..");
const distPath = resolve(rootPath, "dist");
const workerPath = resolve(rootPath, "worker");

const examplePath = resolve(rootPath, "examples", process.argv[2] || "shell");

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
  loader: { ".ts": "ts", ".js": "js", ".cjs": "js", ".mjs": "js" },
  outExtension: { ".js": ".mjs" },
  banner: { js: "'use strict';" },
  plugins: [pnpPlugin()],
};

(async () => {
  await rm(distPath, { force: true, recursive: true });

  await Promise.all([
    build({
      ...basicConfig,
      entryPoints: {
        service: resolve(examplePath, "service.ts"),
        window: resolve(examplePath, "window.ts"),
        worker: resolve(workerPath, "index.ts"),
      },
    }),
  ]);

  await copyFile(
    resolve(examplePath, "index.html"),
    resolve(distPath, "index.html")
  );
})().catch(console.error);
