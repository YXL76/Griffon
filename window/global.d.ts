import type { Deno as DenoType } from "@griffon/deno-std";

/* eslint-disable no-var */
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var Deno: typeof DenoType;
  var SW: ServiceWorker;
  var SWC: ServiceWorkerContainer;
  var SWR: ServiceWorkerRegistration;
  /** Pre-reserved pids. Because the main thread can ask PID synchronously */
  var PRE_RSVD_PIDS: number[];

  /** [Node.js globals](../deno-std/deno_std/node/global.ts) */
  var global: globalThis;
  var process: unknown;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var Buffer: unknown;
  var setImmediate: tyunknownpeof;
  var clearImmediate: unknown;

  function structuredClone<T>(
    message: T,
    options?: StructuredSerializeOptions
  ): T;

  interface ArrayConstructor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isArray<T extends any[]>(arg: T | unknown): arg is T;
  }

  interface Object {
    hasOwn<K extends string>(o: Record<K, unknown>, v: string): v is K;
  }
}
/* eslint-enable no-var */
