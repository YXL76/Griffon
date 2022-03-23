import type { DenoType } from ".";

export type DenoFsMethodsSync =
  | "linkSync"
  | "openSync"
  | "createSync"
  | "readSync"
  | "writeSync"
  | "seekSync"
  | "fsyncSync"
  | "fdatasyncSync"
  | "mkdirSync"
  | "makeTempDirSync"
  | "makeTempFileSync"
  | "chmodSync"
  | "chownSync"
  | "removeSync"
  | "renameSync"
  | "readTextFileSync"
  | "readFileSync"
  | "realPathSync"
  | "readDirSync"
  | "copyFileSync"
  | "readLinkSync"
  | "lstatSync"
  | "statSync"
  | "writeFileSync"
  | "writeTextFileSync"
  | "truncateSync"
  | "symlinkSync"
  | "ftruncateSync"
  | "fstatSync";

export type DenoFsMethodsAsync =
  | "link"
  | "open"
  | "create"
  | "read"
  | "write"
  | "seek"
  | "fsync"
  | "fdatasync"
  | "mkdir"
  | "makeTempDir"
  | "makeTempFile"
  | "chmodSync"
  | "chmod"
  | "chown"
  | "remove"
  | "rename"
  | "readTextFile"
  | "readFile"
  | "realPath"
  | "readDir"
  | "copyFile"
  | "readLink"
  | "lstat"
  | "stat"
  | "writeFile"
  | "writeTextFile"
  | "truncate"
  | "symlink"
  | "ftruncate"
  | "fstat";

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

export type FileInfo = {
  [K in keyof Omit<
    DenoType.FileInfo,
    "atime" | "dev" | "mode" | "uid" | "gid" | "rdev" | "blksize" | "blocks"
  >]: NonNullable<DenoType.FileInfo[K]>;
};

/**
 * Resources (AKA rid) are Deno's version of file descriptors.They are integer values
 * used to refer to open files, sockets, and other concepts. For testing it would be
 * good to be able to query the system for how many open resources there are.
 * {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/core/resources.rs#L29}
 */
export interface Resource {
  name: string;
  close(): void;
}

export abstract class FileResource implements Resource {
  abstract info: FileInfo;

  get name() {
    return "fsFile";
  }

  abstract close(): void;
}
