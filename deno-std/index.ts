export * from "./runtime";
export * from "./types";

import {
  AddrInUse,
  AddrNotAvailable,
  AlreadyExists,
  BadResource,
  BrokenPipe,
  Busy,
  ConnectionAborted,
  ConnectionRefused,
  ConnectionReset,
  FsFile,
  Http,
  Interrupted,
  InvalidData,
  NotConnected,
  NotFound,
  NotSupported,
  PermissionDenied,
  PermissionStatus,
  Permissions,
  SeekMode,
  TimedOut,
  UnexpectedEof,
  WriteZero,
  stderr,
  stdin,
  stdout,
} from "./runtime";
import type { DenoClass, DenoDeprecated, DenoFFI, Resource } from "./types";
import type { Deno as DenoType } from "./lib.deno";

export type { DenoType };

function _notImplemented(): never {
  throw new Error("Not implemented");
}

/** {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/core/resources.rs#L94} */
class ResourceTable {
  #index = new Map<number, Resource>();

  #nextRid = 0;

  add(resource: Resource) {
    const rid = this.#nextRid;
    this.#index.set(rid, resource);
    this.#nextRid += 1;
    return rid;
  }

  has(rid: number) {
    return this.#index.has(rid);
  }

  get(rid: number) {
    return this.#index.get(rid);
  }

  take(rid: number) {
    const resource = this.get(rid);
    if (resource) this.#index.delete(rid);
    return resource;
  }

  close(/* rid: number */) {
    throw new Error("Not implemented");
  }

  print(): DenoType.ResourceMap {
    const ret: DenoType.ResourceMap = {};
    this.#index.forEach((val, key) => (ret[key] = val.name));
    return ret;
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Deno: Omit<
  typeof DenoType,
  DenoDeprecated | DenoClass | DenoFFI
> & {
  _resTable_: ResourceTable;
  _cwd_: string;
  _uid_: number;
  _env_: Map<string, string>;
} = {
  _resTable_: new ResourceTable(),

  errors: /* eslint-disable @typescript-eslint/naming-convention */ {
    NotFound,
    PermissionDenied,
    ConnectionRefused,
    ConnectionReset,
    ConnectionAborted,
    NotConnected,
    AddrInUse,
    AddrNotAvailable,
    BrokenPipe,
    AlreadyExists,
    InvalidData,
    TimedOut,
    Interrupted,
    WriteZero,
    UnexpectedEof,
    BadResource,
    Http,
    Busy,
    NotSupported,
  } /* eslint-enable @typescript-eslint/naming-convention */,

  pid: NaN,
  ppid: 0,

  memoryUsage: () => {
    interface MemoryInfo {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    }
    interface ChromePerformance extends Performance {
      memory?: MemoryInfo;
    }

    const memory = (<ChromePerformance>performance)?.memory;
    if (memory) {
      const { totalJSHeapSize, usedJSHeapSize, jsHeapSizeLimit } = memory;
      return {
        rss: jsHeapSizeLimit,
        heapTotal: totalJSHeapSize,
        heapUsed: usedJSHeapSize,
        external: 0,
      };
    }
    return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 };
  },

  noColor: false,

  test: _notImplemented,
  exit: _notImplemented,

  _env_: new Map(),
  env: {
    get: (key: string) => Deno._env_.get(key),
    set: (key: string, value: string) => Deno._env_.set(key, value),
    delete: (key: string) => Deno._env_.delete(key),
    toObject: () => Object.fromEntries(Deno._env_),
  },

  execPath: () => "/usr/bin/deno",
  chdir: _notImplemented,
  _cwd_: "/",
  cwd: () => Deno._cwd_,
  linkSync: _notImplemented,
  link: _notImplemented,

  // eslint-disable-next-line @typescript-eslint/naming-convention
  SeekMode,

  openSync: _notImplemented,
  open: _notImplemented,
  createSync: _notImplemented,
  create: _notImplemented,
  readSync: _notImplemented,
  read: _notImplemented,
  writeSync: _notImplemented,
  write: _notImplemented,
  seekSync: _notImplemented,
  seek: _notImplemented,
  fsyncSync: _notImplemented,
  fsync: _notImplemented,
  fdatasyncSync: _notImplemented,
  fdatasync: _notImplemented,
  close: _notImplemented,

  // eslint-disable-next-line @typescript-eslint/naming-convention
  FsFile,

  stdin,
  stdout,
  stderr,

  isatty: _notImplemented,

  mkdirSync: _notImplemented,
  mkdir: _notImplemented,
  makeTempDirSync: _notImplemented,
  makeTempDir: _notImplemented,
  makeTempFileSync: _notImplemented,
  makeTempFile: _notImplemented,
  chmodSync: _notImplemented,
  chmod: _notImplemented,
  chownSync: _notImplemented,
  chown: _notImplemented,
  removeSync: _notImplemented,
  remove: _notImplemented,
  renameSync: _notImplemented,
  rename: _notImplemented,
  readTextFileSync: _notImplemented,
  readTextFile: _notImplemented,
  readFileSync: _notImplemented,
  readFile: _notImplemented,
  realPathSync: _notImplemented,
  realPath: _notImplemented,
  readDirSync: _notImplemented,
  readDir: _notImplemented,
  copyFileSync: _notImplemented,
  copyFile: _notImplemented,
  readLinkSync: _notImplemented,
  readLink: _notImplemented,
  lstat: _notImplemented,
  lstatSync: _notImplemented,
  stat: _notImplemented,
  statSync: _notImplemented,
  writeFileSync: _notImplemented,
  writeFile: _notImplemented,
  writeTextFileSync: _notImplemented,
  writeTextFile: _notImplemented,
  truncateSync: _notImplemented,
  truncate: _notImplemented,

  metrics: _notImplemented,
  resources: () => Deno._resTable_.print(),
  watchFs: _notImplemented,

  addSignalListener: _notImplemented,
  removeSignalListener: _notImplemented,
  run: _notImplemented,
  inspect: _notImplemented,

  // eslint-disable-next-line @typescript-eslint/naming-convention
  PermissionStatus,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Permissions,
  permissions: new Permissions(),

  build: {
    target: "",
    arch: "x86_64",
    os: "linux",
    vendor: "",
    env: undefined,
  },

  version: {
    deno: "1.19.3",
    v8: "9.9.115.8",
    typescript: "4.6.2",
  },

  args: [],

  mainModule: "",

  symlinkSync: _notImplemented,
  symlink: _notImplemented,
  ftruncateSync: _notImplemented,
  ftruncate: _notImplemented,
  fstatSync: _notImplemented,
  fstat: _notImplemented,
  serveHttp: _notImplemented,
  upgradeWebSocket: _notImplemented,
  kill: _notImplemented,
  resolveDns: _notImplemented,

  listen: _notImplemented,
  listenTls: _notImplemented,
  connect: _notImplemented,
  connectTls: _notImplemented,
  startTls: _notImplemented,
  shutdown: _notImplemented,

  // Unstable
  bench: _notImplemented,
  umask: _notImplemented,
  consoleSize: _notImplemented,
  loadavg: _notImplemented,
  osRelease: () => "",
  systemMemoryInfo: () => {
    const { rss, heapTotal, heapUsed } = Deno.memoryUsage();
    return {
      total: rss,
      free: heapTotal - heapUsed,
      available: rss - heapUsed,
      buffers: 0,
      cached: 0,
      swapTotal: 0,
      swapFree: 0,
    };
  },
  networkInterfaces: _notImplemented,
  _uid_: NaN,
  getUid: () => Deno._uid_,
  formatDiagnostics: _notImplemented,
  emit: _notImplemented,
  applySourceMap: _notImplemented,
  setRaw: _notImplemented,
  utimeSync: _notImplemented,
  utime: _notImplemented,
  hostname: _notImplemented,
  createHttpClient: _notImplemented,
  futimeSync: _notImplemented,
  futime: _notImplemented,
  sleepSync: _notImplemented,
  listenDatagram: _notImplemented,
  flock: _notImplemented,
  flockSync: _notImplemented,
  funlock: _notImplemented,
  funlockSync: _notImplemented,
  refTimer: _notImplemented,
  unrefTimer: _notImplemented,
  upgradeHttp: _notImplemented,
};

Object.defineProperty(Deno, "_resTable_", { value: Deno._resTable_ });
Object.defineProperty(Deno, "_cwd_", { value: Deno._cwd_, writable: true });
Object.defineProperty(Deno, "_uid_", { value: Deno._uid_, writable: true });
Object.defineProperty(Deno, "_env_", { value: Deno._env_, writable: true });

Deno._resTable_.add(stdin);
Deno._resTable_.add(stdout);
Deno._resTable_.add(stderr);
