export * from "./parent-child";
export * from "./svc-win";
export * from "./win-wkr";
export * from "./wkr-svc";

export const enum CONST {
  serviceURL = "/service.js",
  workerURL = "/worker.js",
}

export type Dict = Record<never, never>;

/** I don't know why, but the compiler like this: */
export type ChanWrap<T> = { data: T };
