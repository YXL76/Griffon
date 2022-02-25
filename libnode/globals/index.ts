export * from "@griffon/libnode-process";

import * as buffer from "@griffon/libnode-buffer";
import * as events from "@griffon/libnode-events";
import * as os from "@griffon/libnode-os";
import * as punycode from "@griffon/libnode-punycode";
import * as querystring from "@griffon/libnode-querystring";
import * as timers from "@griffon/libnode-timers";
import * as url from "@griffon/libnode-url";
import * as util from "@griffon/libnode-util";
import path from "@griffon/libnode-path";

declare const process: Partial<NodeJS.Process> | void;

function _require(id: string) {
  if (id.startsWith("node:")) id = id.slice(5);
  switch (id) {
    case "buffer":
      return buffer;
    case "events":
      return events;
    case "os":
      return os;
    case "punycode":
      return punycode;
    case "querystring":
      return querystring;
    case "timers":
      return timers;
    case "url":
      return url;
    case "util":
      return util;
    case "path":
      return path;
    case "process":
      return typeof process == "object" ? process : {};
    default:
      throw Error(`Module not found: ${id}`);
  }
}

export const require: NodeRequire = _require;

_require.resolve = _resolve;

_require.main = undefined as NodeModule | undefined;

_require.cache = {};

_require.extensions = {} as RequireExtensions;

function _resolve(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options?: { paths?: string[] | undefined }
): string {
  return path.resolve(id);
}

_resolve.paths = () => null;

/* eslint-disable @typescript-eslint/no-explicit-any */
interface NodeRequire {
  (id: string): any;
  resolve: RequireResolve;
  cache: Dict<NodeModule>;
  /**
   * @deprecated
   */
  extensions: RequireExtensions;
  main: NodeModule | undefined;
}

interface Dict<T> {
  [key: string]: T | undefined;
}

interface RequireResolve {
  (id: string, options?: { paths?: string[] | undefined }): string;
  paths(request: string): string[] | null;
}

interface NodeModule {
  /**
   * `true` if the module is running during the Node.js preload
   */
  isPreloading: boolean;
  exports: any;
  require: NodeRequire;
  id: string;
  filename: string;
  loaded: boolean;
  /** @deprecated since 14.6.0 Please use `require.main` and `module.children` instead. */
  parent: NodeModule | null | undefined;
  children: NodeModule[];
  /**
   * @since 11.14.0
   *
   * The directory name of the module. This is usually the same as the path.dirname() of the module.id.
   */
  path: string;
  paths: string[];
}

interface RequireExtensions
  extends Dict<(m: NodeModule, filename: string) => any> {
  ".js": (m: NodeModule, filename: string) => any;
  ".json": (m: NodeModule, filename: string) => any;
  ".node": (m: NodeModule, filename: string) => any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
