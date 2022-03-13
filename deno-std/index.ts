import type { Deno as DenoType } from "./lib.deno";

export { DenoType };

function _notImplemented(): never {
  throw new Error("Not implemented");
}

class NotFound extends Error {}
class PermissionDenied extends Error {}
class ConnectionRefused extends Error {}
class ConnectionReset extends Error {}
class ConnectionAborted extends Error {}
class NotConnected extends Error {}
class AddrInUse extends Error {}
class AddrNotAvailable extends Error {}
class BrokenPipe extends Error {}
class AlreadyExists extends Error {}
class InvalidData extends Error {}
class TimedOut extends Error {}
class Interrupted extends Error {}
class WriteZero extends Error {}
class UnexpectedEof extends Error {}
class BadResource extends Error {}
class Http extends Error {}
class Busy extends Error {}
class NotSupported extends Error {}

enum SeekMode {
  /* eslint-disable @typescript-eslint/naming-convention */ Start = 0,
  Current = 1,
  End = 2 /* eslint-enable @typescript-eslint/naming-convention */,
}

class PermissionStatus
  extends EventTarget
  implements DenoType.PermissionStatus
{
  onchange = null;

  constructor(public readonly state: DenoType.PermissionState = "denied") {
    super();
  }
}

const permissionStatuses: Record<DenoType.PermissionName, PermissionStatus> = {
  env: new PermissionStatus("granted"),
  ffi: new PermissionStatus(),
  hrtime: new PermissionStatus("granted"),
  net: new PermissionStatus(),
  read: new PermissionStatus("granted"),
  run: new PermissionStatus("granted"),
  write: new PermissionStatus("granted"),
};

class Permissions implements DenoType.Permissions {
  query(desc: DenoType.PermissionDescriptor): Promise<PermissionStatus> {
    return Promise.resolve(permissionStatuses[desc.name]);
  }

  revoke(desc: DenoType.PermissionDescriptor): Promise<PermissionStatus> {
    return Promise.resolve(permissionStatuses[desc.name]);
  }

  request(desc: DenoType.PermissionDescriptor): Promise<PermissionStatus> {
    return Promise.resolve(permissionStatuses[desc.name]);
  }
}

type DenoDeprecated =
  | "copy"
  | "iter"
  | "iterSync"
  | "File"
  | "Buffer"
  | "readAll"
  | "readAllSync"
  | "writeAll"
  | "writeAllSync"
  | "customInspect";

type DenoClass = "FsFile" | "Process" | "DiagnosticCategory" | "HttpClient";

type DenoFFI =
  | "UnsafePointer"
  | "UnsafePointerView"
  | "UnsafeFnPointer"
  | "dlopen";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Deno: Omit<
  typeof DenoType,
  DenoDeprecated | DenoClass | DenoFFI
> & {
  _cwd_: string;
  _uid_: number;
  _env_: Map<string, string>;
} = {
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

  stdin: { rid: 0 } as typeof DenoType.stdin,
  stdout: { rid: 1 } as typeof DenoType.stdout,
  stderr: { rid: 2 } as typeof DenoType.stderr,

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
  resources: _notImplemented,

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
};

Object.defineProperty(Deno, "_cwd_", {
  value: Deno._cwd_,
  writable: true,
});

Object.defineProperty(Deno, "_uid_", {
  value: Deno._uid_,
  writable: true,
});

Object.defineProperty(Deno, "_env_", {
  value: Deno._env_,
  writable: true,
});
