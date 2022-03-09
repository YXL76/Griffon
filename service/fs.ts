import type { IFileSystem } from "@griffon/shared";

export class FileSystem implements IFileSystem {
  private static _instance: FileSystem;

  private readonly json: Record<string, string> = {
    "/root/path.js": `'use strict';
const { basename, win32, dirname, extname, isAbsolute, join } = require("path");

console.log(basename("/foo/bar/baz/asdf/quux.html"));
console.log(win32.basename("C:\\\\foo.html", ".html"));
console.log(dirname("/foo/bar/baz/asdf/quux"));
console.log(extname("index.html"));
console.log(isAbsolute("/foo/bar"));
console.log(join("/foo", "bar", "baz/asdf", "quux", ".."));

console.log(process.cwd());

process.exit();`,
    "/root/src/url.js": `const url = require('url');
const myURL = new URL('https://a:b@測試?abc#foo');

console.log(myURL.href);

console.log(myURL.toString());

console.log(url.format(myURL, { fragment: false, unicode: true, auth: false }));

process.exit();`,
  };

  static getInstance(): FileSystem {
    return this._instance ?? (this._instance = new FileSystem());
  }

  readFile(
    path: string,
    options: { encoding?: null | undefined; flag?: string | undefined }
  ): Promise<string> {
    if (path in this.json) return Promise.resolve(this.json[path]);
    throw "File not found";
  }
}
