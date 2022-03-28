import type { DenoType } from "@griffon/deno-std";

/* eslint-disable no-var */
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var Deno: DenoType;
  var SW: ServiceWorker;
  var SWR: ServiceWorkerRegistration;
  /** Shared with all child processes. */
  var SAB: SharedArrayBuffer;
  var SAB32: Int32Array;

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
    isArray<T extends unknown[]>(arg: T | unknown): arg is T;
  }

  interface ObjectConstructor {
    hasOwn<K extends string>(o: Record<K, unknown>, v: string): v is K;
  }
}
/* eslint-enable no-var */
