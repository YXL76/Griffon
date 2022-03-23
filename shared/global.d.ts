import type { Deno as DenoType } from "@griffon/deno-std";

/* eslint-disable no-var */
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var Deno: typeof DenoType;

  function structuredClone<T>(
    message: T,
    options?: StructuredSerializeOptions
  ): T;

  interface ArrayConstructor {
    isArray<T extends unknown[]>(arg: T | unknown): arg is T;
  }

  interface Object {
    hasOwn<K extends string>(o: Record<K, unknown>, v: string): v is K;
  }
}
/* eslint-enable no-var */
