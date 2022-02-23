import { Process, nodeRequire } from "./libnode";

self.process = new Process();

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
    `'use strict';
    const { basename, win32, dirname, extname, isAbsolute, join } = require("path");

    console.log(basename("/foo/bar/baz/asdf/quux.html"));
    console.log(win32.basename("C:\\\\foo.html", ".html"));
    console.log(dirname("/foo/bar/baz/asdf/quux"));
    console.log(extname("index.html"));
    console.log(isAbsolute("/foo/bar"));
    console.log(join("/foo", "bar", "baz/asdf", "quux", ".."));
    
    console.log(process.cwd());`
  ).call(null, _require);
}
