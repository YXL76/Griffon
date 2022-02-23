import { copyFile, mkdir } from "fs/promises";
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
  target: "chrome97",
  minify: prod,

  bundle: true,
  splitting: false,
  platform: "browser",
  loader: { ".ts": "ts", ".js": "js" },
  banner: { js: "'use strict';" },
  plugins: [pnpPlugin()],
};

(async () => {
  await mkdir(distPath, { recursive: true });

  await Promise.all([
    copyFile(
      resolve(process.cwd(), "index.html"),
      resolve(distPath, "index.html")
    ),
    build({
      ...basicConfig,
      outfile: resolve(distPath, "service.js"),
      entryPoints: [resolve(servicePath, "index.ts")],
    }),
    build({
      ...basicConfig,
      outfile: resolve(distPath, "window.js"),
      entryPoints: [resolve(windowPath, "index.ts")],
    }),
    build({
      ...basicConfig,
      outfile: resolve(distPath, "worker.js"),
      entryPoints: [resolve(workerPath, "index.ts")],
    }),
  ]);
})().catch(console.error);
