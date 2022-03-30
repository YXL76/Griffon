import type { FSSyncMsg, FSSyncPostMessage } from "..";
import { Deno } from "@griffon/deno-std";
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

export type ProxyFileKey = "write" | "truncate" | "read" | "seek" | "stat";

export type ProxyFileMsg<K extends ProxyFileKey = ProxyFileKey> =
  | { fn: K; sab: SharedArrayBuffer; args: Parameters<DenoNamespace.FsFile[K]> }
  | { fn: K; port: MessagePort; args: Parameters<DenoNamespace.FsFile[K]> };

function proxyFileHandler(
  file: DenoNamespace.FsFile,
  { data }: MessageEvent<ProxyFileMsg>
) {
  if ("sab" in data) {
    const u8 = new Uint8Array(data.sab);
    const i32 = new Int32Array(data.sab);
    try {
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
    const str = new TextDecoder().decode(u8.subarray(start, start - ret));
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
  const rootFS = await UnionFileSystem.create(postMessage);

  Deno.linkSync = rootFS.linkSync.bind(rootFS);
  Deno.link = rootFS.link.bind(rootFS);
  Deno.openSync = rootFS.openSync.bind(rootFS);
  Deno.open = rootFS.open.bind(rootFS);
  Deno.createSync = rootFS.createSync.bind(rootFS);
  Deno.create = rootFS.create.bind(rootFS);
  Deno.readSync = rootFS.readSync.bind(rootFS);
  Deno.read = rootFS.read.bind(rootFS);
  Deno.writeSync = rootFS.writeSync.bind(rootFS);
  Deno.write = rootFS.write.bind(rootFS);
  Deno.seekSync = rootFS.seekSync.bind(rootFS);
  Deno.seek = rootFS.seek.bind(rootFS);
  Deno.fsyncSync = rootFS.fsyncSync.bind(rootFS);
  Deno.fsync = rootFS.fsync.bind(rootFS);
  Deno.fdatasyncSync = rootFS.fdatasyncSync.bind(rootFS);
  Deno.fdatasync = rootFS.fdatasync.bind(rootFS);
  Deno.mkdirSync = rootFS.mkdirSync.bind(rootFS);
  Deno.mkdir = rootFS.mkdir.bind(rootFS);
  Deno.makeTempDirSync = rootFS.makeTempDirSync.bind(rootFS);
  Deno.makeTempDir = rootFS.makeTempDir.bind(rootFS);
  Deno.makeTempFileSync = rootFS.makeTempFileSync.bind(rootFS);
  Deno.makeTempFile = rootFS.makeTempFile.bind(rootFS);
  Deno.chmodSync = rootFS.chmodSync.bind(rootFS);
  Deno.chmod = rootFS.chmod.bind(rootFS);
  Deno.chownSync = rootFS.chownSync.bind(rootFS);
  Deno.chown = rootFS.chown.bind(rootFS);
  Deno.removeSync = rootFS.removeSync.bind(rootFS);
  Deno.remove = rootFS.remove.bind(rootFS);
  Deno.renameSync = rootFS.renameSync.bind(rootFS);
  Deno.rename = rootFS.rename.bind(rootFS);
  Deno.readTextFileSync = rootFS.readTextFileSync.bind(rootFS);
  Deno.readTextFile = rootFS.readTextFile.bind(rootFS);
  Deno.readFileSync = rootFS.readFileSync.bind(rootFS);
  Deno.readFile = rootFS.readFile.bind(rootFS);
  Deno.realPathSync = rootFS.realPathSync.bind(rootFS);
  Deno.realPath = rootFS.realPath.bind(rootFS);
  Deno.readDirSync = rootFS.readDirSync.bind(rootFS);
  Deno.readDir = rootFS.readDir.bind(rootFS);
  Deno.copyFileSync = rootFS.copyFileSync.bind(rootFS);
  Deno.copyFile = rootFS.copyFile.bind(rootFS);
  Deno.readLinkSync = rootFS.readLinkSync.bind(rootFS);
  Deno.readLink = rootFS.readLink.bind(rootFS);
  Deno.lstatSync = rootFS.lstatSync.bind(rootFS);
  Deno.lstat = rootFS.lstat.bind(rootFS);
  Deno.statSync = rootFS.statSync.bind(rootFS);
  Deno.stat = rootFS.stat.bind(rootFS);
  Deno.writeFileSync = rootFS.writeFileSync.bind(rootFS);
  Deno.writeFile = rootFS.writeFile.bind(rootFS);
  Deno.writeTextFileSync = rootFS.writeTextFileSync.bind(rootFS);
  Deno.writeTextFile = rootFS.writeTextFile.bind(rootFS);
  Deno.truncateSync = rootFS.truncateSync.bind(rootFS);
  Deno.truncate = rootFS.truncate.bind(rootFS);
  Deno.symlinkSync = rootFS.symlinkSync.bind(rootFS);
  Deno.symlink = rootFS.symlink.bind(rootFS);
  Deno.ftruncateSync = rootFS.ftruncateSync.bind(rootFS);
  Deno.ftruncate = rootFS.ftruncate.bind(rootFS);
  Deno.fstatSync = rootFS.fstatSync.bind(rootFS);
  Deno.fstat = rootFS.fstat.bind(rootFS);

  return rootFS;
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
