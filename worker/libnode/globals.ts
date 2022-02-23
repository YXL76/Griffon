/// <reference types="node/globals" />

import * as os from "./os";
import * as querystring from "./querystring";
import * as url from "./url";
import path from "./path";

function _require(id: string) {
  switch (id) {
    case "path":
      return path;
    case "os":
      return os;
    case "querystring":
      return querystring;
    case "url":
      return url;
    default:
      throw Error(`Module not found: ${id}`);
  }
}

export const nodeRequire: NodeRequire = _require;

nodeRequire.resolve = function (request: string, options) {
  return path.resolve(request);
  // return Module._resolveFilename(request, mod, false, options);
};

nodeRequire.main = undefined;

// nodeRequire.resolve.extensions = Module._extensions;

// require.cache = Module._cache;
