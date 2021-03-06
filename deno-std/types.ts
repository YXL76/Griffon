import type { DenoNamespace, DenoType, SeekMode } from ".";

type DenoFsMethodsSyncWithoutTmpnfile =
  | "linkSync"
  | "openSync"
  | "createSync"
  | "mkdirSync"
  | "chmodSync"
  | "chownSync"
  | "removeSync"
  | "renameSync"
  | "realPathSync"
  | "readDirSync"
  | "copyFileSync"
  | "readLinkSync"
  | "lstatSync"
  | "statSync"
  | "truncateSync"
  | "symlinkSync"
  | "utimeSync";

export type DenoFsMethodsAsyncWithoutTmpnfile =
  | "link"
  | "open"
  | "create"
  | "mkdir"
  | "chmod"
  | "chown"
  | "remove"
  | "rename"
  | "realPath"
  | "readDir"
  | "copyFile"
  | "readLink"
  | "lstat"
  | "stat"
  | "truncate"
  | "symlink"
  | "utime";

type DenoTmpFSMethodsSync = "makeTempDirSync" | "makeTempFileSync";
type DenoFileFSMethodsSync =
  | "readSync"
  | "writeSync"
  | "seekSync"
  | "fsyncSync"
  | "fdatasyncSync"
  | "readTextFileSync"
  | "readFileSync"
  | "writeFileSync"
  | "writeTextFileSync"
  | "ftruncateSync"
  | "fstatSync"
  | "futimeSync"
  | "flockSync"
  | "funlockSync";

type DenoTmpFSMethodsAsync = "makeTempDir" | "makeTempFile";
type DenoFileFSMethodsAsync =
  | "read"
  | "write"
  | "seek"
  | "fsync"
  | "fdatasync"
  | "readTextFile"
  | "readFile"
  | "writeFile"
  | "writeTextFile"
  | "ftruncate"
  | "fstat"
  | "futime"
  | "flock"
  | "funlock";

type DenoFsMethodsWithoutTmp =
  | DenoFsMethodsSyncWithoutTmpnfile
  | DenoFsMethodsAsyncWithoutTmpnfile;

type DenoFsMethodsSync =
  | DenoTmpFSMethodsSync
  | DenoFileFSMethodsSync
  | DenoFsMethodsSyncWithoutTmpnfile;

type DenoFsMethodsAsync =
  | DenoTmpFSMethodsAsync
  | DenoFileFSMethodsAsync
  | DenoFsMethodsAsyncWithoutTmpnfile;

type DenoFsMethods = DenoFsMethodsSync | DenoFsMethodsAsync;

export type FileSystem = Partial<Pick<DenoType, DenoFsMethodsWithoutTmp>> & {
  close(): void | Promise<void>;
};

export interface StorageDevice {
  readonly name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newDevice(...args: any[]): Promise<FileSystem>;
}

export type RootFileSystem = Pick<DenoType, DenoFsMethods>;

export type DenoDeprecated =
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

export type DenoClass = "Process" | "DiagnosticCategory" | "HttpClient";

export type DenoFFI =
  | "UnsafePointer"
  | "UnsafePointerView"
  | "UnsafeFnPointer"
  | "dlopen";

export type FileInfo = Omit<
  DenoNamespace.FileInfo,
  "atime" | "dev" | "mode" | "uid" | "gid" | "rdev" | "blksize" | "blocks"
>;

export type FilePerms = Pick<
  DenoNamespace.OpenOptions,
  "read" | "write" | "append"
>;

/**
 * Resources (AKA rid) are Deno's version of file descriptors.They are integer values
 * used to refer to open files, sockets, and other concepts. For testing it would be
 * good to be able to query the system for how many open resources there are.
 * {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/core/resources.rs#L29}
 */
export interface Resource {
  name: string;

  close(): void;
  readSync?(buffer: Uint8Array): number | null;
  read?(buffer: Uint8Array): Promise<number | null>;
  writeSync?(buffer: Uint8Array): number;
  write?(buffer: Uint8Array): Promise<number>;
  syncSync?(): void;
  sync?(): Promise<void>;
  datasyncSync?(): void;
  datasync?(): Promise<void>;
  truncateSync?(len: number): void;
  truncate?(len: number): Promise<void>;
  seekSync?(offset: number, whence: SeekMode): number;
  seek?(offset: number, whence: SeekMode): Promise<number>;
  statSync?(): FileInfo;
  stat?(): Promise<FileInfo>;
  utimeSync?(atime: number | Date, mtime: number | Date): void;
  utime?(atime: number | Date, mtime: number | Date): Promise<void>;
  lockSync?(exclusive?: boolean): void;
  lock?(exclusive?: boolean): Promise<void>;
  unlockSync?(): void;
  unlock?(): Promise<void>;
}

/**
 * {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/runtime/ops/io.rs#L229}
 */
export interface StdFileResource extends Resource {
  name: "fsFile";

  read(buffer: Uint8Array): Promise<number | null>;
  write(buffer: Uint8Array): Promise<number>;
  truncate(len: number): Promise<void>;
  seek(offset: number, whence: SeekMode): Promise<number>;
  stat(): Promise<FileInfo>;
}

/**
 * {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/runtime/ops/io.rs#L103}
 */
export interface WriteOnlyResource extends Resource {
  read: undefined;
  readSync: undefined;

  write(buffer: Uint8Array): Promise<number>;
  stat(): Promise<FileInfo>;
}

/**
 * {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/runtime/ops/io.rs#L137}
 */
export interface ReadOnlyResource extends Resource {
  write: undefined;
  writeSync: undefined;
  truncate: undefined;
  truncateSync: undefined;

  read(buffer: Uint8Array): Promise<number | null>;
  stat(): Promise<FileInfo>;
}

export interface ChildStdinResource extends WriteOnlyResource {
  name: "childStdin";
}

export interface ChildStdoutResource extends ReadOnlyResource {
  name: "childStdout";
}

export interface ChildStderrResource extends ReadOnlyResource {
  name: "childStderr";
}

/**
 * {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/runtime/ops/process.rs#L79}
 */
export interface ChildResource extends Resource {
  name: "child";
}
