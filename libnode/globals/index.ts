export * from "@griffon/libnode-buffer";
export * from "@griffon/libnode-child_process";
export * from "@griffon/libnode-events";
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

const modules = new Map<string, unknown>();

export function injectModule(name: string, module: unknown) {
  modules.set(name, module);
}

function _require(id: string) {
  if (id.startsWith("node:")) id = id.slice(5);
  const ret = modules.get(id);
  if (ret) return ret;

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

export const require: NodeJS.Require = _require;

_require.resolve = _resolve;

_require.main = undefined as NodeModule | undefined;

_require.cache = {};

_require.extensions = {} as NodeJS.RequireExtensions;

function _resolve(
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */ id: string,
  _options?: { paths?: string[] | undefined }
): string {
  return path.resolve(id);
}

_resolve.paths = () => null;
