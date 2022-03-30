export * from "./ext";
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
import type { Deno as DenoNamespace } from "./lib.deno";

export type { DenoNamespace };

export function notImplemented(): never {
  throw new Error("Not implemented");
}

/** {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/core/resources.rs#L94} */
class ResourceTable {
  #index = new Map<number, Resource>();

  #nextRid = 0;

  add(resc: Resource) {
    const rid = this.#nextRid;
    this.#index.set(rid, resc);
    this.#nextRid += 1;
    return rid;
  }

  has(rid: number) {
    return this.#index.has(rid);
  }

  get(rid: number) {
    return this.#index.get(rid);
  }

  getOrThrow(rid: number) {
    const resc = this.#index.get(rid);
    if (!resc) throw NotFound.from(`rid: ${rid}`);
    return resc;
  }

  take(rid: number) {
    const resc = this.get(rid);
    if (resc) this.#index.delete(rid);
    return resc;
  }

  close(rid: number) {
    const resc = this.take(rid);
    resc?.close();
  }

  print(): DenoNamespace.ResourceMap {
    const ret: DenoNamespace.ResourceMap = {};
    this.#index.forEach((val, key) => (ret[key] = val.name));
    return ret;
  }
}

export const RESC_TABLE = new ResourceTable();

export const PCB: {
  cwd: string;
  uid: number;
  env: Map<string, string>;
} = { cwd: "/", uid: NaN, env: new Map() };

export type DenoType = Omit<
  typeof DenoNamespace,
  DenoDeprecated | DenoClass | DenoFFI
>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Deno: DenoType = {
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

  test: notImplemented,
  exit: notImplemented,

  env: {
    get: (key) => PCB.env.get(key),
    set: (key, value) => PCB.env.set(key, value),
    delete: (key) => PCB.env.delete(key),
    toObject: () => Object.fromEntries(PCB.env),
  },

  execPath: () => "/usr/bin/deno",
  chdir: notImplemented,
  cwd: () => PCB.cwd,
  linkSync: notImplemented,
  link: notImplemented,

  // eslint-disable-next-line @typescript-eslint/naming-convention
  SeekMode,

  openSync: notImplemented,
  open: notImplemented,
  createSync: notImplemented,
  create: notImplemented,
  readSync: notImplemented,
  read: notImplemented,
  writeSync: notImplemented,
  write: notImplemented,
  seekSync: notImplemented,
  seek: notImplemented,
  fsyncSync: notImplemented,
  fsync: notImplemented,
  fdatasyncSync: notImplemented,
  fdatasync: notImplemented,
  close: (rid) => RESC_TABLE.close(rid),

  // eslint-disable-next-line @typescript-eslint/naming-convention
  FsFile,

  stdin,
  stdout,
  stderr,

  isatty: notImplemented,

  mkdirSync: notImplemented,
  mkdir: notImplemented,
  makeTempDirSync: notImplemented,
  makeTempDir: notImplemented,
  makeTempFileSync: notImplemented,
  makeTempFile: notImplemented,
  chmodSync: notImplemented,
  chmod: notImplemented,
  chownSync: notImplemented,
  chown: notImplemented,
  removeSync: notImplemented,
  remove: notImplemented,
  renameSync: notImplemented,
  rename: notImplemented,
  readTextFileSync: notImplemented,
  readTextFile: notImplemented,
  readFileSync: notImplemented,
  readFile: notImplemented,
  realPathSync: notImplemented,
  realPath: notImplemented,
  readDirSync: notImplemented,
  readDir: notImplemented,
  copyFileSync: notImplemented,
  copyFile: notImplemented,
  readLinkSync: notImplemented,
  readLink: notImplemented,
  lstat: notImplemented,
  lstatSync: notImplemented,
  stat: notImplemented,
  statSync: notImplemented,
  writeFileSync: notImplemented,
  writeFile: notImplemented,
  writeTextFileSync: notImplemented,
  writeTextFile: notImplemented,
  truncateSync: notImplemented,
  truncate: notImplemented,

  metrics: notImplemented,
  resources: () => RESC_TABLE.print(),
  watchFs: notImplemented,

  addSignalListener: notImplemented,
  removeSignalListener: notImplemented,
  run: notImplemented,
  inspect: notImplemented,

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

  symlinkSync: notImplemented,
  symlink: notImplemented,
  ftruncateSync: notImplemented,
  ftruncate: notImplemented,
  fstatSync: notImplemented,
  fstat: notImplemented,
  serveHttp: notImplemented,
  upgradeWebSocket: notImplemented,
  kill: notImplemented,
  resolveDns: notImplemented,

  listen: notImplemented,
  listenTls: notImplemented,
  connect: notImplemented,
  connectTls: notImplemented,
  startTls: notImplemented,
  shutdown: notImplemented,

  // Unstable
  bench: notImplemented,
  umask: notImplemented,
  consoleSize: notImplemented,
  loadavg: notImplemented,
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
  networkInterfaces: notImplemented,
  getUid: () => PCB.uid,
  formatDiagnostics: notImplemented,
  emit: notImplemented,
  applySourceMap: notImplemented,
  setRaw: notImplemented,
  utimeSync: notImplemented,
  utime: notImplemented,
  hostname: notImplemented,
  createHttpClient: notImplemented,
  futimeSync: notImplemented,
  futime: notImplemented,
  sleepSync: notImplemented,
  listenDatagram: notImplemented,
  flock: notImplemented,
  flockSync: notImplemented,
  funlock: notImplemented,
  funlockSync: notImplemented,
  refTimer: notImplemented,
  unrefTimer: notImplemented,
  upgradeHttp: notImplemented,
};

RESC_TABLE.add(stdin);
RESC_TABLE.add(stdout);
RESC_TABLE.add(stderr);
