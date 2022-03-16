import type { Deno as DenoType } from "@griffon/deno-std";

/* eslint-disable no-var */
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var Deno: typeof DenoType;
  var SW: ServiceWorker;
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
}
/* eslint-enable no-var */
