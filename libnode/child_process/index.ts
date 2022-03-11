import type * as child_process from "node:child_process";
import { EventEmitter } from "@griffon/libnode-events";
import { _processEnv } from "@griffon/libnode-internal/helper";
import { isInt32 } from "@griffon/libnode-internal/validators";

const ERR_INVALID_ARG_VALUE = Error;
const ERR_INVALID_ARG_TYPE = Error;

export function normalizeSpawnArguments(
  file: string,
  args?: string[] | child_process.SpawnOptions | void,
  options?: child_process.SpawnOptions | void
): child_process.SpawnOptions & {
  args: string[];
  envPairs: string[];
  file: string;
} {
  // validateString(file, "file");

  if (file.length === 0)
    throw new ERR_INVALID_ARG_VALUE("file cannot be empty");
  // throw new ERR_INVALID_ARG_VALUE("file", file, "cannot be empty");

  if (Array.isArray(args)) {
    args = args.slice();
  } else if (args == null) {
    args = [];
  } else if (typeof args !== "object") {
    // throw new ERR_INVALID_ARG_TYPE("args", "object", args);
    throw new ERR_INVALID_ARG_TYPE(`args object `);
  } else {
    options = args;
    args = [];
  }

  if (options === undefined) options = {};
  // else validateObject(options, "options");

  const cwd = options.cwd;

  // Validate the cwd, if present.
  if (cwd != null) {
    // cwd = getValidatedPath(cwd, "options.cwd");
  }

  // Validate detached, if present.
  if (options.detached != null) {
    // validateBoolean(options.detached, "options.detached");
  }

  // Validate the uid, if present.
  if (options.uid != null && !isInt32(options.uid)) {
    throw new ERR_INVALID_ARG_TYPE("options.uid");
    // throw new ERR_INVALID_ARG_TYPE("options.uid", "int32", options.uid);
  }

  // Validate the gid, if present.
  if (options.gid != null && !isInt32(options.gid)) {
    throw new ERR_INVALID_ARG_TYPE("options.gid");
  }

  // Validate the shell, if present.
  if (
    options.shell != null &&
    typeof options.shell !== "boolean" &&
    typeof options.shell !== "string"
  ) {
    throw new ERR_INVALID_ARG_TYPE(
      "options.shell"
      // ["boolean", "string"],
      // options.shell
    );
  }

  // Validate argv0, if present.
  if (options.argv0 != null) {
    // validateString(options.argv0, "options.argv0");
  }

  // Validate windowsHide, if present.
  if (options.windowsHide != null) {
    // validateBoolean(options.windowsHide, "options.windowsHide");
  }

  // Validate windowsVerbatimArguments, if present.
  const { windowsVerbatimArguments } = options;
  if (windowsVerbatimArguments != null) {
    /* validateBoolean(
      windowsVerbatimArguments,
      "options.windowsVerbatimArguments"
    ); */
  }

  /* if (options.shell) {
    const command = ArrayPrototypeJoin([file, ...args], " ");
    // Set the shell, switches, and commands.
    if (process.platform === "win32") {
      if (typeof options.shell === "string") file = options.shell;
      else file = process.env.comspec || "cmd.exe";
      // '/d /s /c' is used only for cmd.exe.
      if (RegExpPrototypeTest(/^(?:.*\\)?cmd(?:\.exe)?$/i, file)) {
        args = ["/d", "/s", "/c", `"${command}"`];
        windowsVerbatimArguments = true;
      } else {
        args = ["-c", command];
      }
    } else {
      if (typeof options.shell === "string") file = options.shell;
      else if (process.platform === "android") file = "/system/bin/sh";
      else file = "/bin/sh";
      args = ["-c", command];
    }
  } */

  if (typeof options.argv0 === "string") {
    args.unshift(options.argv0);
  } else {
    args.unshift(file);
  }

  const env = options.env || _processEnv();
  const envPairs: string[] = [];

  // process.env.NODE_V8_COVERAGE always propagates, making it possible to
  // collect coverage for programs that spawn with white-listed environment.
  /* if (
    process.env.NODE_V8_COVERAGE &&
    !ObjectPrototypeHasOwnProperty(options.env || {}, "NODE_V8_COVERAGE")
  ) {
    env.NODE_V8_COVERAGE = process.env.NODE_V8_COVERAGE;
  } */

  const envKeys: string[] = [];
  // Prototype values are intentionally included.
  for (const key in env) {
    envKeys.push(key);
  }

  /* if (process.platform === "win32") {
    // On Windows env keys are case insensitive. Filter out duplicates,
    // keeping only the first one (in lexicographic order)
    const sawKey = new SafeSet();
    envKeys = ArrayPrototypeFilter(ArrayPrototypeSort(envKeys), (key) => {
      const uppercaseKey = StringPrototypeToUpperCase(key);
      if (sawKey.has(uppercaseKey)) {
        return false;
      }
      sawKey.add(uppercaseKey);
      return true;
    });
  } */

  for (const key of envKeys) {
    const value = env[key];
    if (value !== undefined) {
      envPairs.push(`${key}=${value}`);
    }
  }

  return {
    // Make a shallow copy so we don't clobber the user's options object.
    ...options,
    args,
    cwd,
    detached: !!options.detached,
    envPairs,
    file,
    windowsHide: !!options.windowsHide,
    windowsVerbatimArguments: !!windowsVerbatimArguments,
  };
}

export abstract class BaseChildProcess
  extends EventEmitter
  implements Omit<child_process.ChildProcess, keyof EventEmitter>
{
  stdin = null;

  stdout = null;

  stderr = null;

  readonly channel = undefined;

  readonly stdio = [
    null,
    null,
    null,
    undefined,
    undefined,
  ] as child_process.ChildProcess["stdio"];

  killed = false;

  readonly pid?: number | undefined;

  readonly connected = true;

  readonly exitCode = null;

  readonly signalCode = null;

  readonly spawnargs = [];

  readonly spawnfile = "";

  send(
    message: child_process.Serializable,
    callback?: (error: Error | null) => void
  ): boolean;
  send(
    message: child_process.Serializable,
    sendHandle?: child_process.SendHandle,
    callback?: (error: Error | null) => void
  ): boolean;
  send(
    message: child_process.Serializable,
    sendHandle?: child_process.SendHandle,
    options?: child_process.MessageOptions,
    callback?: (error: Error | null) => void
  ): boolean;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(..._args: []): boolean {
    return false;
  }

  abstract kill(signal?: NodeJS.Signals | number): boolean;
  abstract disconnect(): void;
  abstract unref(): void;
  abstract ref(): void;
}
