/// <reference types="node/globals" />

import path from "../libnode/path";

function _require(id: string) {
  switch (id) {
    case "path":
      return path;
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
