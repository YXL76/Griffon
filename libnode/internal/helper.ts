declare const process: NodeJS.Process | void;

export const isWindows = !!process && process?.platform === "win32";

export function _processArch(): NodeJS.Process["arch"] {
  return process?.arch || "x64";
}

export function _processPlatform(): NodeJS.Platform {
  return process?.platform || "linux";
}

export function _processCwd(): ReturnType<NodeJS.Process["cwd"]> {
  return process ? process.cwd() : "/";
}

export function _processEnv(): NodeJS.Process["env"] {
  return process ? process.env : {};
}

export function _processNextTick<T extends Array<unknown>>(
  callback: (...args: T) => unknown,
  ...args: T
): void {
  process
    ? process.nextTick(callback, ...args)
    : queueMicrotask(() => callback(...args));
}
