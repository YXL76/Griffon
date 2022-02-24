declare const process: NodeJS.Process | void;

export function isWindows() {
  try {
    return !!process && process?.platform === "win32";
  } catch {
    return false;
  }
}

export function _processArch(): NodeJS.Process["arch"] {
  try {
    return process?.arch || "x64";
  } catch {
    return "x64";
  }
}

export function _processPlatform(): NodeJS.Platform {
  try {
    return process?.platform || "linux";
  } catch {
    return "linux";
  }
}

export function _processCwd(): ReturnType<NodeJS.Process["cwd"]> {
  try {
    return process?.cwd() ?? "/";
  } catch {
    return "/";
  }
}

export function _processEnv(): NodeJS.Process["env"] {
  try {
    return process?.env ?? {};
  } catch {
    return {};
  }
}

export function _processNextTick<T extends Array<unknown>>(
  callback: (...args: T) => unknown,
  ...args: T
): void {
  try {
    if (process) process.nextTick(callback, ...args);
    else throw Error;
  } catch {
    queueMicrotask(() => callback(...args));
  }
}
