import { copyFile, mkdir } from "fs/promises";
import type { BuildOptions } from "esbuild";
import { build } from "esbuild";
import { pnpPlugin } from "@yarnpkg/esbuild-plugin-pnp";
import { resolve } from "path";

const prod = process.env["NODE_ENV"] === "production";

const rootPath = resolve(process.cwd(), "..");
const distPath = resolve(rootPath, "dist");
const taskPath = resolve(rootPath, "task");
const kernelPath = resolve(rootPath, "kernel");

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
      outfile: resolve(distPath, "kernel.js"),
      entryPoints: [resolve(kernelPath, "index.ts")],
    }),
    build({
      ...basicConfig,
      outfile: resolve(distPath, "task.js"),
      entryPoints: [resolve(taskPath, "index.ts")],
    }),
  ]);
})().catch(console.error);
