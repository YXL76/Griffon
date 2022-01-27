/// <reference types="node/globals" />

import * as os from "../libnode/os";
import * as querystring from "../libnode/querystring";
import * as url from "../libnode/url";
import path from "../libnode/path";

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
