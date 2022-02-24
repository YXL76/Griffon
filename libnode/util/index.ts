export { types, promisify } from "@griffon/libnode-internal/util";

import { _processNextTick } from "@griffon/libnode-internal/helper";
import { hideStackFrames } from "@griffon/libnode-internal/errors";

const globalTextDecoder = TextDecoder;
const globalTextEncoder = TextEncoder;

export { globalTextDecoder as TextDecoder, globalTextEncoder as TextEncoder };

const ERR_INVALID_ARG_TYPE = Error;
const ERR_FALSY_VALUE_REJECTION = Error;

const callbackifyOnRejected = hideStackFrames(
  (reason: string | null | Error, cb: (...args: unknown[]) => void) => {
    // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
    // Because `null` is a special error value in callbacks which means "no error
    // occurred", we error-wrap so the callback consumer can distinguish between
    // "the promise rejected with null" or "the promise fulfilled with undefined".
    if (!reason) {
      reason = new ERR_FALSY_VALUE_REJECTION(reason as string);
    }
    return cb(reason);
  }
);

export function callbackify<T1, T2, TResult>(
  original: (arg1: T1, arg2: T2) => Promise<TResult>
): (
  arg1: T1,
  arg2: T2,
  callback: (err: NodeJS.ErrnoException | null, result: TResult) => void
) => void {
  if (typeof original !== "function") {
    // throw new ERR_INVALID_ARG_TYPE("original", "Function", original);
    throw new ERR_INVALID_ARG_TYPE("original");
  }

  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified(this: unknown, ...args: unknown[]) {
    const maybeCb = args.pop() as Parameters<ReturnType<typeof callbackify>>[2];
    if (typeof maybeCb !== "function") {
      // throw new ERR_INVALID_ARG_TYPE("last argument", "Function", maybeCb);
      throw new ERR_INVALID_ARG_TYPE("last argument");
    }
    const cb = maybeCb.bind(this);
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    (Reflect.apply(original, this, args) as Promise<TResult>).then(
      (ret) => _processNextTick(cb, null, ret),
      (rej) => _processNextTick(callbackifyOnRejected, rej, cb)
    );
  }

  const descriptors = Object.getOwnPropertyDescriptors(original);
  // It is possible to manipulate a functions `length` or `name` property. This
  // guards against the manipulation.
  if (typeof descriptors.length.value === "number") {
    descriptors.length.value++;
  }
  if (typeof descriptors.name.value === "string") {
    descriptors.name.value += "Callbackified";
  }
  Object.defineProperties(callbackified, descriptors);
  return callbackified;
}
