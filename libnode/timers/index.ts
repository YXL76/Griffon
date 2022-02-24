/// <reference types="node/timers" />

import "setimmediate";

const webSetTimeout = self.setTimeout;
const webSetInterval = self.setInterval;

const webClearTimeout = self.clearTimeout;
const webClearInterval = self.clearInterval;

export const setTimeout = (...args: unknown[]) =>
  new Timeout(
    Reflect.apply(webSetTimeout, null, args) as number,
    webClearTimeout
  );

export const setInterval = (...args: unknown[]) =>
  new Timeout(
    Reflect.apply(webSetInterval, null, args) as number,
    webClearInterval
  );

function clear(timer?: Timeout) {
  timer?.close();
}

export const clearTimeout = clear;
export const clearInterval = clear;

class Timeout implements NodeJS.Timeout {
  constructor(
    private readonly _id: number,
    private readonly _clear: (id?: number) => void
  ) {}

  valueOf() {
    return this._id;
  }

  toString() {
    return this._id;
  }

  // TODO
  refresh() {
    return this;
  }

  hasRef() {
    return true;
  }

  unref() {
    return this;
  }

  ref() {
    return this;
  }

  close() {
    this._clear(this._id);
  }

  [Symbol.toPrimitive] = () => this._id;
}
