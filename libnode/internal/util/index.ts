export * as types from "./types";

const kCustomPromisifiedSymbol = Symbol.for("nodejs.util.promisify.custom");
const kCustomPromisifyArgsSymbol = Symbol("customPromisifyArgs");

export const customPromisifyArgs = kCustomPromisifyArgsSymbol;

export function promisify<T1, T2, TResult>(
  original: (
    arg1: T1,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ arg2: T2,
    callback: (err: any, result: TResult) => void
  ) => void
): (arg1: T1, arg2: T2) => Promise<TResult> {
  // Lazy-load to avoid a circular dependency.
  /* if (validateFunction === undefined)
    ({ validateFunction } = require("internal/validators"));

  validateFunction(original, "original"); */

  if (
    (original as unknown as { [kCustomPromisifiedSymbol]?: unknown })[
      kCustomPromisifiedSymbol
    ]
  ) {
    const fn = (
      original as unknown as { [kCustomPromisifiedSymbol]?: unknown }
    )[kCustomPromisifiedSymbol] as (arg1: T1, arg2: T2) => Promise<TResult>;

    // validateFunction(fn, "util.promisify.custom");

    return Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn,
      enumerable: false,
      writable: false,
      configurable: true,
    });
  }

  // Names to create an object from in case the callback receives multiple
  // arguments, e.g. ['bytesRead', 'buffer'] for fs.read.
  const argumentNames = (
    original as unknown as { [kCustomPromisifyArgsSymbol]?: string[] }
  )[kCustomPromisifyArgsSymbol];

  function fn(
    this: (arg1: T1, arg2: T2) => Promise<TResult>,
    ...args: [T1, T2]
  ): Promise<TResult> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Array.prototype.push(args, (err: any, ...values: [TResult]) => {
        if (err) return reject(err);

        if (argumentNames !== undefined && values.length > 1) {
          const obj: Record<string, unknown> = {};
          for (let i = 0; i < argumentNames.length; i++)
            obj[argumentNames[i]] = values[i];
          resolve(obj as unknown as TResult);
        } else {
          resolve(values[0]);
        }
      });
      Reflect.apply(original, this, args);
    });
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original) as object | null);

  Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn,
    enumerable: false,
    writable: false,
    configurable: true,
  });
  return Object.defineProperties(
    fn,
    Object.getOwnPropertyDescriptors(original)
  );
}

promisify.custom = kCustomPromisifiedSymbol;

// As of V8 6.6, depending on the size of the array, this is anywhere
// between 1.5-10x faster than the two-arg version of Array#splice()
export function spliceOne<T>(list: Array<T>, index: number) {
  for (; index + 1 < list.length; index++) list[index] = list[index + 1];
  list.pop();
}
