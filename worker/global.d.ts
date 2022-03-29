import type { DenoType } from "@griffon/deno-std";
import type { UnionFileSystem } from "@griffon/shared";

/* eslint-disable no-var */
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var Deno: DenoType;
  var ROOT_FS: UnionFileSystem;
  /** ID in the main thread. */
  var WID: number;
  var WIN: MessagePort;
  /** SharedArrayBuffer from parent process. */
  var SAB: SharedArrayBuffer;
  /** SharedArrayBuffer from main thread. */
  var WIN_SAB: SharedArrayBuffer;
  var WIN_SAB32: Int32Array;

  /** [Node.js globals](../deno-std/deno_std/node/global.ts) */
  var global: globalThis;
  var process: unknown;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var Buffer: unknown;
  var setImmediate: tyunknownpeof;
  var clearImmediate: unknown;

  interface ArrayConstructor {
    isArray<T extends unknown[]>(arg: T | unknown): arg is T;
  }

  interface ObjectConstructor {
    hasOwn<K extends string>(o: Record<K, unknown>, v: string): v is K;
  }
}
/* eslint-enable no-var */
