/// <reference types="node/process" />

export class Process implements NodeJS.Process {
  readonly stdin!: NodeJS.ReadStream & { fd: 0 };

  readonly stdout!: NodeJS.WriteStream & { fd: 1 };

  readonly stderr!: NodeJS.WriteStream & { fd: 2 };

  readonly argv: string[] = ["node"];

  readonly execArgv: string[] = [];

  readonly execPath = "node";

  readonly debugPort = 0;

  readonly env = {};

  exitCode?: number;

  readonly version = "";

  readonly versions = {} as NodeJS.ProcessVersions;

  readonly config = {} as NodeJS.ProcessConfig;

  title = "griffon";

  readonly arch = "x64";

  readonly platform = "linux" as NodeJS.Platform;

  readonly mainModule?: NodeJS.Module;

  readonly memoryUsage = _memoryUsage;

  features = {
    inspector: false,
    debug: false,
    uv: false,
    ipv6: false,
    /* eslint-disable @typescript-eslint/naming-convention */
    tls_alpn: false,
    tls_sni: false,
    tls_ocsp: false,
    /* eslint-enable @typescript-eslint/naming-convention */
    tls: false,
  };

  readonly release = {} as NodeJS.ProcessRelease;

  readonly hrtime = _hrtime;

  connected = false;

  allowedNodeEnvironmentFlags = new Set<string>();

  report?: NodeJS.ProcessReport | undefined;

  traceDeprecation = false;

  private readonly _startTime = performance.now();

  constructor(
    public readonly pid: number,
    public readonly ppid: number,
    private _cwd: string
  ) {}

  get argv0() {
    return this.argv[0];
  }

  openStdin(): NodeJS.Socket {
    throw Error("Not implemented");
  }

  abort(): never {
    throw Error("Not implemented");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chdir(_directory: string) {
    // noop
  }

  cwd() {
    return this._cwd;
  }

  /* eslint-disable @typescript-eslint/ban-types */
  emitWarning(warning: string | Error, ctor?: Function): void;
  emitWarning(warning: string | Error, type?: string, ctor?: Function): void;
  emitWarning(
    warning: string | Error,
    type?: string,
    code?: string,
    ctor?: Function
  ): void;
  emitWarning(
    warning: string | Error,
    options?: NodeJS.EmitWarningOptions
  ): void;
  emitWarning(
    warning: string | Error,
    /* eslint-disable @typescript-eslint/no-unused-vars */
    _type?: string | Function | NodeJS.EmitWarningOptions,
    _code?: string | Function,
    _ctor?: Function
    /* eslint-enable @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars */
  ): void {
    console.error(warning);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  exit(_code?: number): never {
    throw Error("Not implemented");
  }

  getgid() {
    return 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setgid(_id: number | string) {
    throw Error("Not implemented");
  }

  getuid() {
    return 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setuid(_id: number | string) {
    throw Error("Not implemented");
  }

  geteuid() {
    return 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  seteuid(_id: number | string) {
    throw Error("Not implemented");
  }

  getegid() {
    return 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setegid(_id: number | string) {
    throw Error("Not implemented");
  }

  getgroups(): number[] {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setgroups(_groups: ReadonlyArray<string | number>) {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setUncaughtExceptionCaptureCallback(_cb: ((err: Error) => void) | null) {
    // noop
  }

  hasUncaughtExceptionCaptureCallback() {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  kill(_pid: number, _signal?: string | number) {
    return true as const;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cpuUsage(_previousValue?: NodeJS.CpuUsage): NodeJS.CpuUsage {
    throw Error("Not implemented");
  }

  nextTick<T extends Array<unknown>>(
    callback: (...args: T) => unknown,
    ...args: T
  ): void {
    queueMicrotask(() => callback(...args));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  umask(_mask?: string | number): number {
    throw Error("Not implemented");
  }

  uptime() {
    return (performance.now() - this._startTime) / 1000;
  }

  send?( // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: any, // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendHandle?: any,
    options?: {
      swallowErrors?: boolean | undefined;
    },
    callback?: (error: Error | null) => void
  ): boolean;

  disconnect() {
    // noop
  }

  resourceUsage() {
    return {} as NodeJS.ResourceUsage;
  }

  addListener() {
    return this;
  }

  emit(event: "beforeExit", code: number): boolean;
  emit(event: "disconnect"): boolean;
  emit(event: "exit", code: number): boolean;
  emit(event: "rejectionHandled", promise: Promise<unknown>): boolean;
  emit(event: "uncaughtException", error: Error): boolean;
  emit(event: "uncaughtExceptionMonitor", error: Error): boolean;
  emit(
    event: "unhandledRejection",
    reason: unknown,
    promise: Promise<unknown>
  ): boolean;
  emit(event: "warning", warning: Error): boolean;
  emit(event: "message", message: unknown, sendHandle: unknown): this;
  emit(event: NodeJS.Signals, signal: NodeJS.Signals): boolean;
  emit(
    event: "multipleResolves",
    type: NodeJS.MultipleResolveType,
    promise: Promise<unknown>,
    value: unknown
  ): this;
  emit(event: "worker", listener: NodeJS.WorkerListener): this;
  emit(
    event: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _msg?:
      | number
      | Promise<unknown>
      | Error
      | NodeJS.Signals
      | NodeJS.MultipleResolveType
      | NodeJS.WorkerListener
  ): boolean | this | void {
    switch (event) {
      case "beforeExit":
      case "disconnect":
      case "exit":
      case "rejectionHandled":
      case "uncaughtException":
      case "uncaughtExceptionMonitor":
      case "unhandledRejection":
      case "warning":
        return true;
      case "message":
      case "multipleResolves":
      case "worker":
        return this;
    }
  }

  on() {
    return this;
  }

  once() {
    return this;
  }

  prependListener() {
    return this;
  }

  prependOnceListener() {
    return this;
  }

  listeners() {
    return [];
  }
}

function _memoryUsage() {
  interface ChromePerformance extends Performance {
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  }

  const memory = (<ChromePerformance>performance)?.memory;
  if (memory) {
    const { totalJSHeapSize, usedJSHeapSize, jsHeapSizeLimit } = memory;
    return {
      rss: jsHeapSizeLimit,
      heapTotal: totalJSHeapSize,
      heapUsed: usedJSHeapSize,
      external: 0,
      arrayBuffers: 0,
    };
  }
  return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 };
}

_memoryUsage.rss = () => _memoryUsage().rss;

/**
 * @see {@link https://github.com/cabinjs/browser-hrtime/blob/master/src/index.ts}
 * MIT License
 *
 * Copyright (c) 2020 Vlad Tansky
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
function _hrtime(previousTimestamp?: [number, number]): [number, number] {
  const baseNow = Math.floor((Date.now() - performance.now()) * 1e-3);
  const clocktime = performance.now() * 1e-3;
  let seconds = Math.floor(clocktime) + baseNow;
  let nanoseconds = Math.floor((clocktime % 1) * 1e9);

  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [seconds, nanoseconds];
}
const NS_PER_SEC = BigInt(1e9);
_hrtime.bigint = (time?: [number, number]): bigint => {
  const [s, n] = _hrtime(time);
  return BigInt(s) * NS_PER_SEC + BigInt(n);
};
