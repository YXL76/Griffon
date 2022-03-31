import { Deno, notImplemented } from "@griffon/deno-std";
import type { FSSyncMsg, FSSyncPostMessage } from "..";
import type { DenoNamespace } from "@griffon/deno-std";
import { UnionFileSystem } from ".";

type SyncError = { name: string; msg: string };

export async function fsSyncHandler(
  fs: UnionFileSystem,
  msg: FSSyncMsg,
  ports: ReadonlyArray<MessagePort>
) {
  const u8 = new Uint8Array(msg.sab);
  const i32 = new Int32Array(msg.sab);
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ret = await fs[msg.fn](...msg.args);

    let encoded: Uint8Array;
    if (typeof ret === "string") encoded = new TextEncoder().encode(ret);
    else if (typeof ret === "undefined") {
      // Must have length, or the main thread will wait forever.
      encoded = new Uint8Array(1);
    } else if (typeof ret === "object") {
      if ("mtime" in ret) {
        /** FileInfo */
        // NOTE: The `Date` object is not serializable
        encoded = new TextEncoder().encode(JSON.stringify(ret));
      } else if ("writeSync" in ret) {
        /** FsFile */
        ports[0].onmessage = proxyFileHandler.bind(null, ret);
        encoded = new Uint8Array(1);
      } else {
        /** { [Symbol.asyncIterator](): AsyncGenerator<Deno.DirEntry, void, unknown>; } */
        const dirs = [];
        for await (const dir of ret) dirs.push(dir);
        encoded = new TextEncoder().encode(JSON.stringify(dirs));
      }
    } else {
      encoded = new Uint8Array(1);
    }

    u8.set(encoded, Int32Array.BYTES_PER_ELEMENT + 1);
    Atomics.store(i32, 0, encoded.length);
  } catch (err) {
    const { name, message } = err as Error;
    const str = JSON.stringify(<SyncError>{ name, msg: message });
    const encoded = new TextEncoder().encode(str);
    u8.set(encoded, Int32Array.BYTES_PER_ELEMENT + 1);

    Atomics.store(i32, 0, -encoded.length);
  } finally {
    Atomics.notify(i32, 0);
  }
}

export type ProxyFileKey =
  | "close"
  | "write"
  | "truncate"
  | "read"
  | "seek"
  | "stat";

export type ProxyFileMsg<K extends ProxyFileKey = ProxyFileKey> =
  | { fn: K; sab: SharedArrayBuffer; args: Parameters<DenoNamespace.FsFile[K]> }
  | { fn: K; port: MessagePort; args: Parameters<DenoNamespace.FsFile[K]> };

async function proxyFileHandler(
  file: DenoNamespace.FsFile,
  { data }: MessageEvent<ProxyFileMsg>
) {
  if ("sab" in data) {
    const u8 = new Uint8Array(data.sab);
    const i32 = new Int32Array(data.sab);
    try {
      if (!(data.fn in file)) notImplemented();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const ret = await file[data.fn](...data.args);

      let encoded: Uint8Array;
      if (typeof ret === "undefined") {
        // Must have length, or the main thread will wait forever.
        encoded = new Uint8Array(1);
      } else if (typeof ret === "object" || typeof ret === "number") {
        encoded = new TextEncoder().encode(JSON.stringify(ret));
      } else {
        encoded = new Uint8Array(1);
      }

      u8.set(encoded, Int32Array.BYTES_PER_ELEMENT + 1);
      Atomics.store(i32, 0, encoded.length);
    } catch (err) {
      const { name, message } = err as Error;
      const str = JSON.stringify(<SyncError>{ name, msg: message });
      const encoded = new TextEncoder().encode(str);
      u8.set(encoded, Int32Array.BYTES_PER_ELEMENT + 1);

      Atomics.store(i32, 0, -encoded.length);
    } finally {
      Atomics.notify(i32, 0);
    }
  } else {
    try {
      if (!(data.fn in file)) notImplemented();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const ret = await file[data.fn](...data.args);
      data.port.postMessage({ ret });
    } catch (err) {
      const { name, message } = err as Error;
      data.port.postMessage(<SyncError>{ name, msg: message });
    }
  }
}

const TIMEOUT = 2000;

export function waitMsg(sab: SharedArrayBuffer) {
  const i32 = new Int32Array(sab);
  /**
   * Cannot use `Atomics.wait` in the main thread.
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (typeof window !== "object") Atomics.wait(i32, 0, 0, TIMEOUT);
  else {
    const start = performance.now();
    while (i32[0] === 0 && performance.now() - start < TIMEOUT) {
      // Do nothing.
    }
  }
  const ret = Atomics.exchange(i32, 0, 0);
  if (ret === 0) throw new Error("Timeout.");
  else if (ret < 0) {
    const u8 = new Uint8Array(sab);
    const start = Int32Array.BYTES_PER_ELEMENT + 1;
    const str = new TextDecoder().decode(
      new Uint8Array(u8.subarray(start, start - ret))
    );
    const { name, msg } = JSON.parse(str) as SyncError;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Err = <ErrorConstructor>(Deno.errors[name] ?? self[name] ?? Error);
    throw new Err(msg);
  }
  return ret;
}

export async function hackDenoFS(postMessage: FSSyncPostMessage) {
  const rootfs = await UnionFileSystem.create(postMessage);

  Deno.linkSync = rootfs.linkSync.bind(rootfs);
  Deno.link = rootfs.link.bind(rootfs);
  Deno.openSync = rootfs.openSync.bind(rootfs);
  Deno.open = rootfs.open.bind(rootfs);
  Deno.createSync = rootfs.createSync.bind(rootfs);
  Deno.create = rootfs.create.bind(rootfs);
  Deno.readSync = rootfs.readSync.bind(rootfs);
  Deno.read = rootfs.read.bind(rootfs);
  Deno.writeSync = rootfs.writeSync.bind(rootfs);
  Deno.write = rootfs.write.bind(rootfs);
  Deno.seekSync = rootfs.seekSync.bind(rootfs);
  Deno.seek = rootfs.seek.bind(rootfs);
  Deno.fsyncSync = rootfs.fsyncSync.bind(rootfs);
  Deno.fsync = rootfs.fsync.bind(rootfs);
  Deno.fdatasyncSync = rootfs.fdatasyncSync.bind(rootfs);
  Deno.fdatasync = rootfs.fdatasync.bind(rootfs);
  Deno.mkdirSync = rootfs.mkdirSync.bind(rootfs);
  Deno.mkdir = rootfs.mkdir.bind(rootfs);
  Deno.makeTempDirSync = rootfs.makeTempDirSync.bind(rootfs);
  Deno.makeTempDir = rootfs.makeTempDir.bind(rootfs);
  Deno.makeTempFileSync = rootfs.makeTempFileSync.bind(rootfs);
  Deno.makeTempFile = rootfs.makeTempFile.bind(rootfs);
  Deno.chmodSync = rootfs.chmodSync.bind(rootfs);
  Deno.chmod = rootfs.chmod.bind(rootfs);
  Deno.chownSync = rootfs.chownSync.bind(rootfs);
  Deno.chown = rootfs.chown.bind(rootfs);
  Deno.removeSync = rootfs.removeSync.bind(rootfs);
  Deno.remove = rootfs.remove.bind(rootfs);
  Deno.renameSync = rootfs.renameSync.bind(rootfs);
  Deno.rename = rootfs.rename.bind(rootfs);
  Deno.readTextFileSync = rootfs.readTextFileSync.bind(rootfs);
  Deno.readTextFile = rootfs.readTextFile.bind(rootfs);
  Deno.readFileSync = rootfs.readFileSync.bind(rootfs);
  Deno.readFile = rootfs.readFile.bind(rootfs);
  Deno.realPathSync = rootfs.realPathSync.bind(rootfs);
  Deno.realPath = rootfs.realPath.bind(rootfs);
  Deno.readDirSync = rootfs.readDirSync.bind(rootfs);
  Deno.readDir = rootfs.readDir.bind(rootfs);
  Deno.copyFileSync = rootfs.copyFileSync.bind(rootfs);
  Deno.copyFile = rootfs.copyFile.bind(rootfs);
  Deno.readLinkSync = rootfs.readLinkSync.bind(rootfs);
  Deno.readLink = rootfs.readLink.bind(rootfs);
  Deno.lstatSync = rootfs.lstatSync.bind(rootfs);
  Deno.lstat = rootfs.lstat.bind(rootfs);
  Deno.statSync = rootfs.statSync.bind(rootfs);
  Deno.stat = rootfs.stat.bind(rootfs);
  Deno.writeFileSync = rootfs.writeFileSync.bind(rootfs);
  Deno.writeFile = rootfs.writeFile.bind(rootfs);
  Deno.writeTextFileSync = rootfs.writeTextFileSync.bind(rootfs);
  Deno.writeTextFile = rootfs.writeTextFile.bind(rootfs);
  Deno.truncateSync = rootfs.truncateSync.bind(rootfs);
  Deno.truncate = rootfs.truncate.bind(rootfs);
  Deno.symlinkSync = rootfs.symlinkSync.bind(rootfs);
  Deno.symlink = rootfs.symlink.bind(rootfs);
  Deno.ftruncateSync = rootfs.ftruncateSync.bind(rootfs);
  Deno.ftruncate = rootfs.ftruncate.bind(rootfs);
  Deno.fstatSync = rootfs.fstatSync.bind(rootfs);
  Deno.fstat = rootfs.fstat.bind(rootfs);
  Deno.utimeSync = rootfs.utimeSync.bind(rootfs);
  Deno.utime = rootfs.utime.bind(rootfs);
  Deno.futime = rootfs.futime.bind(rootfs);
  Deno.futimeSync = rootfs.futimeSync.bind(rootfs);
  Deno.flock = rootfs.flock.bind(rootfs);
  Deno.flockSync = rootfs.flockSync.bind(rootfs);
  Deno.funlock = rootfs.funlock.bind(rootfs);
  Deno.funlockSync = rootfs.funlockSync.bind(rootfs);

  return rootfs;
}

export function newFileInfo() {
  const birthtime = new Date();
  return {
    isFile: true,
    isDirectory: false,
    isSymlink: false,
    size: 0,
    mtime: birthtime,
    birthtime,
    nlink: 1,
  };
}

export function newDirInfo() {
  const birthtime = new Date();
  return {
    isFile: false,
    isDirectory: true,
    isSymlink: false,
    size: 0,
    mtime: birthtime,
    birthtime,
    nlink: 1,
  };
}

export function newSymlinkInfo() {
  const birthtime = new Date();
  return {
    isFile: false,
    isDirectory: false,
    isSymlink: true,
    size: 0,
    mtime: birthtime,
    birthtime,
    nlink: 1,
  };
}
