export * from "./fetch";
export * from "./parent-child";
export * from "./signals";
export * from "./svc-win";
export * from "./win-win";
export * from "./win-wkr";
export * from "./wkr-svc";

export const enum CONST {
  serviceURL = "/service.mjs",
  workerURL = "/worker.mjs",
  pidUnit = 1000,
}

export function pid2Uid(pid: number) {
  return Math.floor(pid / CONST.pidUnit);
}

export function pid2Wid(pid: number) {
  return pid % CONST.pidUnit;
}

export type Dict = Record<never, never>;

/** I don't know why, but the compiler like this: */
export type ChanWrap<T> = { data: T };
