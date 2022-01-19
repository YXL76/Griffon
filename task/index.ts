import { Process, nodeRequire } from "./libnode";

self.onmessage = ({ data }) => {
  if (data.type === "sab") {
    self.sab = data.sab;
    start();
  }
};

function _require(id: string) {
  if (id.startsWith("node:")) {
    return nodeRequire(id) as unknown;
  }
  return nodeRequire(id) as unknown;
}

function start() {
  /** @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval! Never use eval()!} */
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  Function(
    "require",
    "process",
    `'use strict'; require("path");console.log(process.cwd());`
  ).call(null, _require, new Process());
}
