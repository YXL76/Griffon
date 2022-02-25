declare const process: Partial<NodeJS.Process> | void;

export function isWindows() {
  return typeof process == "object" && process?.platform === "win32";
}

export function _processArch(): NodeJS.Process["arch"] {
  return typeof process == "object" ? process?.arch ?? "x64" : "x64";
}

export function _processPlatform(): NodeJS.Platform {
  return typeof process == "object" ? process?.platform || "linux" : "linux";
}

export function _processCwd(): ReturnType<NodeJS.Process["cwd"]> {
  return typeof process == "object" ? process?.cwd?.() ?? "/" : "/";
}

export function _processEnv(): NodeJS.Process["env"] {
  return typeof process == "object" ? process?.env ?? {} : {};
}

export function _processNextTick<T extends Array<unknown>>(
  callback: (...args: T) => unknown,
  ...args: T
): void {
  if (typeof process == "object" && typeof process?.nextTick === "function")
    process.nextTick(callback, ...args);
  else queueMicrotask(() => callback(...args));
}
