/// <reference types="node/events" />

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
declare const process: Partial<NodeJS.Process> | void;

interface EventEmitterOptions {
  /**
   * Enables automatic capturing of promise rejection.
   */
  captureRejections?: boolean | undefined;
}

type EventName = string | symbol;
interface ListenerFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]): void;
  listener?: ListenerFn;
}

function getListener(listener: ListenerFn) {
  return listener.listener || listener;
}

export function getEventListeners(
  emitter: EventTarget | EventEmitter,
  name: EventName
): ListenerFn[] {
  if (emitter instanceof EventEmitter) return emitter.listeners(name);
  return [];
}

export function listenerCount(emitter: EventEmitter, eventName: EventName) {
  return emitter.listenerCount(eventName);
}

export const errorMonitor = Symbol("events.errorMonitor");

export default EventEmitter;

/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
export class EventEmitter implements NodeJS.EventEmitter {
  static readonly errorMonitor = errorMonitor;

  static defaultMaxListeners = 10;

  private _maxListeners = EventEmitter.defaultMaxListeners;

  private _events: Record<EventName, ListenerFn | ListenerFn[]> = {};

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_options?: EventEmitterOptions) {
    // noop
  }

  static listenerCount(emitter: EventEmitter, eventName: EventName) {
    return listenerCount(emitter, eventName);
  }

  static getEventListeners(
    emitter: EventTarget | EventEmitter,
    name: EventName
  ) {
    return getEventListeners(emitter, name);
  }

  addListener(eventName: EventName, listener: ListenerFn) {
    return this._on(eventName, listener, false);
  }

  on(eventName: EventName, listener: ListenerFn) {
    return this._on(eventName, listener, false);
  }

  once(eventName: EventName, listener: ListenerFn) {
    return this._once(eventName, listener, false);
  }

  removeListener(eventName: EventName, listener: ListenerFn): this {
    return this.off(eventName, listener);
  }

  off(eventName: EventName, listener: ListenerFn) {
    if (typeof listener !== "function")
      throw new Error("removeListener only takes instances of Function");

    // does not use listeners(), so no side effect of creating _events[type]
    const handlers = this._events[eventName];
    if (!handlers) return this;

    if (typeof handlers === "function") {
      if (handlers === listener || handlers.listener === listener) {
        delete this._events[eventName];
        this.emit("removeListener", eventName, listener);
      }
    } else {
      const idx = handlers.findIndex(
        (i) => i === listener || i.listener === listener
      );
      if (idx !== -1) {
        if (handlers.length === 1) delete this._events[eventName];
        else handlers.splice(idx, 1);
        this.emit("removeListener", eventName, listener);
      }
    }

    return this;
  }

  removeAllListeners(event?: EventName) {
    if (!event) this._events = {};
    else if (this._events) delete this._events[event];
    return this;
  }

  setMaxListeners(n: number) {
    this._maxListeners = n;
    return this;
  }

  getMaxListeners() {
    return this._maxListeners;
  }

  listeners(eventName: EventName): ListenerFn[] {
    if (eventName) {
      const listeners = this._events[eventName];
      if (!listeners) return [];
      return typeof listeners === "function"
        ? [getListener(listeners)]
        : listeners.map(getListener);
    }

    const keys = Reflect.ownKeys(this._events);
    let i = keys.length;
    const allListeners = [];
    while (i-- > 0) {
      const listeners = this._events[keys[i]];
      if (!listeners) continue;
      if (typeof listeners === "function")
        allListeners.push(getListener(listeners));
      else {
        for (let j = 0, l = listeners.length; j < l; j++) {
          allListeners.push(getListener(listeners[j]));
        }
      }
    }
    return allListeners;
  }

  rawListeners(eventName: EventName): ListenerFn[] {
    if (eventName) {
      const listeners = this._events[eventName];
      if (!listeners) return [];
      return typeof listeners === "function" ? [listeners] : listeners.slice();
    }

    const keys = Reflect.ownKeys(this._events);
    let i = keys.length;
    const allListeners = [];
    while (i-- > 0) {
      const listeners = this._events[keys[i]];
      if (!listeners) continue;
      if (typeof listeners === "function") allListeners.push(listeners);
      else allListeners.push(...listeners);
    }
    return allListeners;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(eventName: EventName, ...args: any[]) {
    const handler = this._events[eventName];
    if (!handler) {
      // Unhandled 'error' event
      if (eventName === "error") {
        const errhandlers = this._events[errorMonitor];
        if (typeof errhandlers === "function") errhandlers.apply(this, args);
        else
          for (let i = 0, l = errhandlers.length; i < l; i++)
            errhandlers[i].apply(this, args);

        if (args?.[0] instanceof Error) throw args[0];
        else throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    } else if (typeof handler === "function") {
      handler.apply(this, args);
    } else {
      // need to make copy of handlers because list can change in the middle
      // of emit call
      const handlers = handler.slice();
      for (let i = 0, l = handlers.length; i < l; i++) {
        handlers[i].apply(this, args);
      }
    }

    return true;
  }

  listenerCount(eventName: EventName) {
    return this.listeners(eventName).length;
  }

  prependListener(eventName: EventName, listener: ListenerFn) {
    return this._on(eventName, listener, true);
  }

  prependOnceListener(eventName: EventName, listener: ListenerFn) {
    return this._once(eventName, listener, true);
  }

  eventNames(): Array<EventName> {
    const _events = this._events;
    return _events ? Reflect.ownKeys(_events) : [];
  }

  private _on(
    eventName: EventName,
    listener: ListenerFn,
    prepend: boolean
  ): this {
    if (typeof listener !== "function")
      throw new Error("on only accepts instances of Function");

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit("newListener", eventName, listener);

    if (!this._events[eventName]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[eventName] = listener;
    } else {
      {
        const handler = this._events[eventName];
        if (typeof handler === "function") this._events[eventName] = [handler]; // Change to array.
      }
      const handler = this._events[eventName] as ListenerFn[];

      // If we've already got an array, just add
      if (prepend) handler.unshift(listener);
      else handler.push(listener);

      // Check for listener leak
      if (this._maxListeners && handler.length > this._maxListeners)
        this._logPossibleMemoryLeak(handler.length);
    }

    return this;
  }

  private _once(eventName: EventName, listener: ListenerFn, prepend: boolean) {
    if (typeof listener !== "function")
      throw new Error("many only accepts instances of Function");

    const listenerWrapper: ListenerFn = (...args) => {
      this.off(eventName, listener);
      return listener.apply(this, args);
    };

    listenerWrapper.listener = listener;

    return this._on(eventName, listenerWrapper, prepend);
  }

  private _logPossibleMemoryLeak(count: number) {
    const errorMsg = `(node) warning: possible EventEmitter memory leak detected. ${count} listeners added. Use emitter.setMaxListeners() to increase limit.`;

    if (typeof process === "object" && process?.emitWarning) {
      const e = new Error(errorMsg);
      e.name = "MaxListenersExceededWarning";
      // TODO
      // e.emitter = this;
      // e.count = count;
      process.emitWarning(e);
    } else {
      console.error(errorMsg);
      console.trace();
    }
  }
}
