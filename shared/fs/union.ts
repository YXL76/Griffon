import "../global";

import {
  AlreadyExists,
  Deno,
  NotFound,
  RESC_TABLE,
  checkOpenOptions,
  coerceLen,
  notImplemented,
  pathFromURL,
  readAll,
  readAllInnerSized,
  readAllSync,
  readAllSyncSized,
} from "@griffon/deno-std";
import type {
  DenoNamespace,
  FileSystem,
  Resource,
  RootFileSystem,
  SeekMode,
  StorageDevice,
} from "@griffon/deno-std";
import {
  FileAccessFileSystem,
  fileAccessStorageDevice,
  indexedDBStorageDevice,
} from ".";
import type { FSSyncMsg } from "..";
import { ParentChildTp } from "..";
import { resolve } from "@griffon/deno-std/deno_std/path/posix";

class DeviceFileSystem implements FileSystem {
  readonly #storageDevs: Record<string, { dev: StorageDevice; cnt: number }> = {
    [fileAccessStorageDevice.name]: { dev: fileAccessStorageDevice, cnt: 0 },
    [indexedDBStorageDevice.name]: { dev: indexedDBStorageDevice, cnt: 0 },
  };

  readonly #tree = new Map<string, FileSystem>();

  has(path: string) {
    return this.#tree.has(path);
  }

  set(path: string, fs: FileSystem) {
    if (this.#tree.has(path)) throw new AlreadyExists(path);
    this.#tree.set(path, fs);
  }

  get(path: string) {
    return this.#tree.get(path);
  }

  delete(path: string) {
    this.#tree.delete(path);
  }

  async newStorageDev<D extends StorageDevice>(
    name: D["name"],
    ...args: Parameters<D["newDevice"]>
  ) {
    const dev = this.#storageDevs[name];
    if (!dev) throw new NotFound(name);
    const newDev = await dev.dev.newDevice(...args);
    dev.cnt += 1;
    this.#tree.set(`/${name}${dev.cnt}`, newDev);
  }

  readDirSync(path: string | URL) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const tree = this.#tree;
    return {
      *[Symbol.iterator]() {
        for (const path of tree.keys()) {
          if (!path.startsWith(absPath)) continue;
          const name = path.slice(absPath.length + 1);
          if (!name || name.includes("/")) continue;
          yield { name, isFile: false, isDirectory: false, isSymlink: false };
        }
      },
    };
  }

  readDir(path: string | URL) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const tree = this.#tree;
    return {
      // eslint-disable-next-line @typescript-eslint/require-await
      async *[Symbol.asyncIterator]() {
        for (const path of tree.keys()) {
          if (!path.startsWith(absPath)) continue;
          const name = path.slice(absPath.length + 1);
          if (!name || name.includes("/")) continue;
          yield { name, isFile: false, isDirectory: false, isSymlink: false };
        }
      },
    };
  }
}

type SyncError = { name: string; msg: string };

// eslint-disable-next-line @typescript-eslint/naming-convention
type Mounts = Record<string, FileSystem> & { "/dev": DeviceFileSystem };

interface PostMessage {
  (message: FSSyncMsg, transfer: Transferable[]): void;
  (message: FSSyncMsg, options?: StructuredSerializeOptions): void;
}

const _t = ParentChildTp.fsSync;
const TIMEOUT = 2000;

class UnionFileSystem extends FileAccessFileSystem implements RootFileSystem {
  private static _instance?: UnionFileSystem;

  /**
   * Cannot use `Atomics.wait` in the main thread.
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  readonly #canWait = typeof window !== "object";

  readonly #sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 1024);

  readonly #postMessage: PostMessage;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly #mounts: Mounts = { "/dev": new DeviceFileSystem() };

  private constructor(
    root: FileSystemDirectoryHandle,
    postMessage: PostMessage
  ) {
    super(root);
    this.#postMessage = postMessage;
  }

  static async create(postMessage: PostMessage) {
    if (this._instance) return this._instance;

    const root = await navigator.storage.getDirectory();
    if ((await root.queryPermission({ mode: "readwrite" })) !== "granted") {
      if ((await root.requestPermission({ mode: "readwrite" })) !== "granted") {
        throw new Error("Permission denied");
      }
    }
    return (this._instance = new UnionFileSystem(root, postMessage));
  }

  newStorageDev<D extends StorageDevice>(
    name: D["name"],
    ...args: Parameters<D["newDevice"]>
  ) {
    return this.#mounts["/dev"].newStorageDev(name, ...args);
  }

  mount(device: string | URL, point: string | URL) {
    const pointStr = pathFromURL(point);
    const absPoint = resolve(pointStr);

    if (Object.keys(this.#mounts).find((v) => absPoint.startsWith(v)))
      throw new AlreadyExists(`mount '${pointStr}'`);

    const deviceStr = pathFromURL(device);
    const absDevice = resolve(deviceStr);

    const dev = this.#mounts["/dev"].get(absDevice.slice(5));
    if (!absDevice.startsWith("/dev") || !dev)
      throw new Error(`invalid device '${deviceStr}'`);

    this.#mounts[absPoint] = dev;
  }

  unmount(point: string | URL) {
    const pointStr = pathFromURL(point);
    const absPoint = resolve(pointStr);

    delete this.#mounts[absPoint];
  }

  linkSync(oldpath: string, newpath: string) {
    const { i, fs, rp, ap } = this.#accessMount(oldpath, "linkSync");
    const { fs: nFs, rp: np, ap: nap } = this.#accessMount(newpath, "linkSync");

    if (fs !== nFs) notImplemented();
    if (fs && i) return fs.linkSync(rp, np);

    this.#postMessage({ _t, fn: "link", sab: this.#sab, args: [ap, nap] });
    this.#wait();
  }

  link(oldpath: string, newpath: string) {
    const { i, fs: oldFs, rp: oldp } = this.#accessMount(oldpath, "link");
    const { fs: newFs, rp: newp } = this.#accessMount(newpath, "link");

    if (oldFs !== newFs) notImplemented();
    if (oldFs && i) return oldFs.link(oldp, newp);

    notImplemented();
  }

  openSync(
    path: string | URL,
    options: DenoNamespace.OpenOptions = { read: true }
  ) {
    checkOpenOptions(options);

    const { i, fs, rp } = this.#accessMount(path, "openSync");
    if (fs && i) return fs.openSync(rp, options);

    notImplemented();
  }

  override open(
    path: string | URL,
    options: DenoNamespace.OpenOptions = { read: true }
  ) {
    checkOpenOptions(options);

    const { i, fs, rp } = this.#accessMount(path, "open");
    if (fs && i) return fs.open(rp, options);

    return super.open(rp, options);
  }

  createSync(path: string | URL) {
    const { i, fs, rp } = this.#accessMount(path, "createSync");
    if (fs && i) return fs.createSync(rp);

    notImplemented();
  }

  override create(path: string | URL) {
    const { i, fs, rp } = this.#accessMount(path, "create");
    if (fs && i) return fs.create(rp);

    return super.create(rp);
  }

  readSync(rid: number, buffer: Uint8Array) {
    if (buffer.length === 0) return 0;

    const resc = this.#getResc(rid, "readSync");

    const nread = resc.readSync(buffer);
    return nread === 0 ? null : nread;
  }

  async read(rid: number, buffer: Uint8Array) {
    if (buffer.length === 0) return 0;

    const resc = this.#getResc(rid, "read");

    const nread = await resc.read(buffer);
    return nread === 0 ? null : nread;
  }

  writeSync(rid: number, data: Uint8Array) {
    const resc = this.#getResc(rid, "writeSync");

    return resc.writeSync(data);
  }

  write(rid: number, data: Uint8Array) {
    const resc = this.#getResc(rid, "write");

    return resc.write(data);
  }

  seekSync(rid: number, offset: number, whence: SeekMode) {
    const resc = this.#getResc(rid, "seekSync");

    return resc.seekSync(offset, whence);
  }

  seek(rid: number, offset: number, whence: SeekMode) {
    const resc = this.#getResc(rid, "seek");

    return resc.seek(offset, whence);
  }

  fsyncSync(rid: number) {
    const resc = this.#getResc(rid, "syncSync");

    return resc.syncSync();
  }

  async fsync(rid: number) {
    const resc = this.#getResc(rid, "sync");

    return resc.sync();
  }

  fdatasyncSync(rid: number) {
    const resc = this.#getResc(rid, "datasyncSync");

    return resc.datasyncSync();
  }

  async fdatasync(rid: number) {
    const resc = this.#getResc(rid, "datasync");

    return resc.datasync();
  }

  mkdirSync(path: string | URL, options?: DenoNamespace.MkdirOptions) {
    const { i, fs, rp, ap } = this.#accessMount(path, "mkdirSync");
    if (fs && i) return fs.mkdirSync(rp, options);

    this.#postMessage({ _t, fn: "mkdir", sab: this.#sab, args: [ap, options] });
    this.#wait();
  }

  override mkdir(path: string | URL, options?: DenoNamespace.MkdirOptions) {
    const { i, fs, rp } = this.#accessMount(path, "mkdir");
    if (fs) {
      if (i) return fs.mkdir(rp, options);

      notImplemented();
    }

    return super.mkdir(rp, options);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  makeTempDirSync(_options?: DenoNamespace.MakeTempOptions): string {
    notImplemented();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  makeTempDir(_options?: DenoNamespace.MakeTempOptions): Promise<string> {
    notImplemented();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  makeTempFileSync(_options?: DenoNamespace.MakeTempOptions): string {
    notImplemented();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  makeTempFile(_options?: DenoNamespace.MakeTempOptions): Promise<string> {
    notImplemented();
  }

  override chmodSync(path: string | URL, mode: number) {
    const { i, fs, rp, ap } = this.#accessMount(path, "chmodSync");
    if (fs) {
      if (i) return fs.chmodSync(rp, mode);

      this.#postMessage({ _t, fn: "chmod", sab: this.#sab, args: [ap, mode] });
      this.#wait();
    }

    return super.chmodSync(rp, mode);
  }

  override chmod(path: string | URL, mode: number) {
    const { i, fs, rp } = this.#accessMount(path, "chmod");
    if (fs) {
      if (i) return fs.chmod(rp, mode);

      notImplemented();
    }

    return super.chmod(rp, mode);
  }

  override chownSync(
    path: string | URL,
    uid: number | null,
    gid: number | null
  ) {
    const { i, fs, rp, ap } = this.#accessMount(path, "chownSync");
    if (fs) {
      if (i) return fs.chownSync(rp, uid, gid);

      this.#postMessage({
        _t,
        fn: "chown",
        sab: this.#sab,
        args: [ap, uid, gid],
      });
      this.#wait();
    }

    return super.chownSync(rp, uid, gid);
  }

  override chown(path: string | URL, uid: number | null, gid: number | null) {
    const { i, fs, rp } = this.#accessMount(path, "chown");
    if (fs) {
      if (i) return fs.chown(rp, uid, gid);

      notImplemented();
    }

    return super.chown(rp, uid, gid);
  }

  removeSync(path: string | URL, options?: DenoNamespace.RemoveOptions) {
    const { i, fs, rp, ap } = this.#accessMount(path, "removeSync");
    if (fs && i) return fs.removeSync(rp, options);

    this.#postMessage({
      _t,
      fn: "remove",
      sab: this.#sab,
      args: [ap, options],
    });
    this.#wait();
  }

  override remove(path: string | URL, options?: DenoNamespace.RemoveOptions) {
    const { i, fs, rp } = this.#accessMount(path, "remove");
    if (fs) {
      if (i) return fs.remove(rp, options);

      notImplemented();
    }

    return super.remove(rp, options);
  }

  renameSync(oldpath: string | URL, newpath: string | URL) {
    const { i, fs, rp, ap } = this.#accessMount(oldpath, "renameSync");
    const {
      fs: nfs,
      rp: nrp,
      ap: nap,
    } = this.#accessMount(newpath, "renameSync");

    if (fs !== nfs) notImplemented();
    if (fs && i) return fs.renameSync(rp, nrp);

    this.#postMessage({ _t, fn: "rename", sab: this.#sab, args: [ap, nap] });
    this.#wait();
  }

  override rename(oldpath: string | URL, newpath: string | URL) {
    const { i, fs: oldFs, rp: oldp } = this.#accessMount(oldpath, "rename");
    const { fs: newFs, rp: newp } = this.#accessMount(newpath, "rename");

    if (oldFs !== newFs) notImplemented();
    if (oldFs) {
      if (i) return oldFs.rename(oldp, newp);

      notImplemented();
    }

    return super.rename(oldp, newp);
  }

  readTextFileSync(path: string | URL) {
    return new TextDecoder().decode(this.readFileSync(path));
  }

  async readTextFile(
    path: string | URL,
    options?: DenoNamespace.ReadFileOptions
  ) {
    return new TextDecoder().decode(await this.readFile(path, options));
  }

  readFileSync(path: string | URL) {
    let file: DenoNamespace.FsFile;
    try {
      file = this.openSync(path);
    } catch {
      const ap = resolve(pathFromURL(path));
      const sab = new SharedArrayBuffer(
        Int32Array.BYTES_PER_ELEMENT * 1024 * 1024 * 8
      ); // Bigger than [this.#sab]
      this.#postMessage({ _t, fn: "readFile", sab, args: [ap] });
      const ret = this.#wait();

      const u8 = new Uint8Array(sab);
      const start = Int32Array.BYTES_PER_ELEMENT + 1;
      return new Uint8Array(u8.subarray(start, start + ret));
    }

    try {
      const { size } = file.statSync();
      if (size === 0) {
        return readAllSync(file);
      } else {
        return readAllSyncSized(file, size);
      }
    } finally {
      file.close();
    }
  }

  async readFile(path: string | URL, options?: DenoNamespace.ReadFileOptions) {
    const file = await this.open(path);
    try {
      const { size } = await file.stat();
      if (size === 0) {
        return await readAll(file);
      } else {
        return await readAllInnerSized(file, size, options);
      }
    } finally {
      file.close();
    }
  }

  realPathSync(path: string | URL) {
    const { i, fs, rp, ap } = this.#accessMount(path, "realPathSync");
    if (fs && i) return fs.realPathSync(rp);

    this.#postMessage({ _t, fn: "realPath", sab: this.#sab, args: [ap] });
    const ret = this.#wait();

    const u8 = new Uint8Array(this.#sab);
    const start = Int32Array.BYTES_PER_ELEMENT + 1;
    return new TextDecoder().decode(u8.subarray(start, start + ret));
  }

  realPath(path: string | URL) {
    const { i, fs, rp } = this.#accessMount(path, "realPath");
    if (fs && i) return fs.realPath(rp);

    notImplemented();
  }

  readDirSync(path: string | URL) {
    const absPath = resolve(pathFromURL(path));
    const { i, fs, rp, ap } = this.#accessMount(absPath, "readDirSync");

    let iter: Iterable<DenoNamespace.DirEntry>;
    if (fs && i) iter = fs.readDirSync(rp);
    else {
      this.#postMessage({ _t, fn: "readDir", sab: this.#sab, args: [ap] });
      const ret = this.#wait();

      const u8 = new Uint8Array(this.#sab);
      const start = Int32Array.BYTES_PER_ELEMENT + 1;
      const decoded = new TextDecoder().decode(u8.subarray(start, start + ret));
      iter = JSON.parse(decoded) as DenoNamespace.DirEntry[];
    }

    const mounts = Object.keys(this.#mounts);

    return {
      *[Symbol.iterator]() {
        for (const entry of iter) yield entry;

        const prefixLen = absPath === "/" ? 1 : absPath.length + 1;
        for (const devpath of mounts) {
          if (!devpath.startsWith(absPath)) continue;

          const name = devpath.slice(prefixLen);
          if (!name || name.includes("/")) continue;
          yield { name, isFile: false, isDirectory: true, isSymlink: false };
        }
      },
    };
  }

  override readDir(path: string | URL) {
    const absPath = resolve(pathFromURL(path));
    const { i, fs, rp } = this.#accessMount(path, "readDir");

    const iter = fs ? (i ? fs.readDir(rp) : undefined) : super.readDir(rp);
    const mounts = Object.keys(this.#mounts);

    return {
      async *[Symbol.asyncIterator]() {
        if (iter) {
          for await (const entry of iter) yield entry;
        }

        const prefixLen = absPath === "/" ? 1 : absPath.length + 1;
        for (const devpath of mounts) {
          if (!devpath.startsWith(absPath)) continue;

          const name = devpath.slice(prefixLen);
          if (!name || name.includes("/")) continue;
          yield { name, isFile: false, isDirectory: true, isSymlink: false };
        }
      },
    };
  }

  copyFileSync(fromPath: string | URL, toPath: string | URL) {
    const { i, fs, rp, ap } = this.#accessMount(fromPath, "copyFileSync");
    const {
      fs: tofs,
      rp: torp,
      ap: toap,
    } = this.#accessMount(toPath, "copyFileSync");

    if (fs !== tofs) {
      const data = this.readFileSync(fromPath);
      this.writeFileSync(toPath, data);
    } else {
      if (fs && i) return fs.copyFileSync(rp, torp);

      this.#postMessage({
        _t,
        fn: "copyFile",
        sab: this.#sab,
        args: [ap, toap],
      });
      this.#wait();
    }
  }

  override async copyFile(fromPath: string | URL, toPath: string | URL) {
    const { i, fs, rp } = this.#accessMount(fromPath, "copyFile");
    const { fs: tofs, rp: torp } = this.#accessMount(toPath, "copyFile");

    if (fs !== tofs) {
      let fromFile: DenoNamespace.FsFile;
      if (fs) {
        if (typeof fs.open !== "function") notImplemented();
        fromFile = await fs.open(rp);
      } else {
        fromFile = await super.open(rp);
      }

      let toFile: DenoNamespace.FsFile;
      if (tofs) {
        if (typeof tofs.open !== "function") notImplemented();
        toFile = await tofs.open(torp, { write: true, create: true });
      } else {
        toFile = await super.open(torp, { write: true, create: true });
      }

      await fromFile.readable.pipeTo(toFile.writable);
    } else {
      if (fs) {
        if (i) return fs.copyFile(rp, torp);

        notImplemented();
      }

      return super.copyFile(rp, torp);
    }
  }

  readLinkSync(path: string | URL) {
    const { i, fs, rp, ap } = this.#accessMount(path, "readLinkSync");
    if (fs && i) return fs.readLinkSync(rp);

    this.#postMessage({ _t, fn: "readLink", sab: this.#sab, args: [ap] });
    const ret = this.#wait();

    const u8 = new Uint8Array(this.#sab);
    const start = Int32Array.BYTES_PER_ELEMENT + 1;
    return new TextDecoder().decode(u8.subarray(start, start + ret));
  }

  readLink(path: string | URL) {
    const { i, fs, rp } = this.#accessMount(path, "readLink");
    if (fs && i) return fs.readLink(rp);

    notImplemented();
  }

  lstatSync(path: string | URL) {
    const { i, fs, rp, ap } = this.#accessMount(path, "lstatSync");
    if (fs && i) return fs.lstatSync(rp);

    this.#postMessage({ _t, fn: "lstat", sab: this.#sab, args: [ap] });
    const ret = this.#wait();

    const u8 = new Uint8Array(this.#sab);
    const start = Int32Array.BYTES_PER_ELEMENT + 1;
    const decoded = new TextDecoder().decode(u8.subarray(start, start + ret));
    return JSON.parse(decoded) as DenoNamespace.FileInfo;
  }

  override lstat(path: string | URL) {
    const { i, fs, rp } = this.#accessMount(path, "lstat");
    if (fs) {
      if (i) return fs.lstat(rp);

      notImplemented();
    }

    return super.lstat(rp);
  }

  statSync(path: string | URL) {
    const { i, fs, rp, ap } = this.#accessMount(path, "statSync");
    if (fs && i) return fs.statSync(rp);

    this.#postMessage({ _t, fn: "stat", sab: this.#sab, args: [ap] });
    const ret = this.#wait();

    const u8 = new Uint8Array(this.#sab);
    const start = Int32Array.BYTES_PER_ELEMENT + 1;
    const decoded = new TextDecoder().decode(u8.subarray(start, start + ret));
    return JSON.parse(decoded) as DenoNamespace.FileInfo;
  }

  override stat(path: string | URL) {
    const { i, fs, rp } = this.#accessMount(path, "stat");
    if (fs) {
      if (i) return fs.stat(rp);

      notImplemented();
    }

    return super.stat(rp);
  }

  writeFileSync(
    path: string | URL,
    data: Uint8Array,
    options: DenoNamespace.WriteFileOptions = {}
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    options.signal?.throwIfAborted();
    if (options.create !== undefined) {
      const create = !!options.create;
      if (!create) {
        // verify that file exists
        this.statSync(path);
      }
    }

    const openOptions = options.append
      ? { write: true, create: true, append: true }
      : { write: true, create: true, truncate: true };

    let file: DenoNamespace.FsFile;
    try {
      file = this.openSync(path, openOptions);
    } catch {
      const ap = resolve(pathFromURL(path));
      // TODO: transferable data ?
      this.#postMessage({
        _t,
        fn: "writeFile",
        sab: this.#sab,
        args: [ap, data, options],
      });
      this.#wait();
      return;
    }

    if (
      options.mode !== undefined &&
      options.mode !== null /* &&
      build.os !== "windows" */
    ) {
      this.chmodSync(path, options.mode);
    }

    let nwritten = 0;
    while (nwritten < data.length) {
      nwritten += file.writeSync(data.subarray(nwritten));
    }

    file.close();
  }

  async writeFile(
    path: string | URL,
    data: Uint8Array,
    options: DenoNamespace.WriteFileOptions = {}
  ) {
    if (options.create !== undefined) {
      const create = !!options.create;
      if (!create) {
        // verify that file exists
        await this.stat(path);
      }
    }

    const openOptions = options.append
      ? { write: true, create: true, append: true }
      : { write: true, create: true, truncate: true };
    const file = await this.open(path, openOptions);

    if (
      options.mode !== undefined &&
      options.mode !== null /* &&
      build.os !== "windows" */
    ) {
      await this.chmod(path, options.mode);
    }

    const signal = options?.signal ?? null;
    let nwritten = 0;
    try {
      while (nwritten < data.length) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        signal?.throwIfAborted?.();
        nwritten += await file.write(data.subarray(nwritten));
      }
    } finally {
      file.close();
    }
  }

  writeTextFileSync(
    path: string | URL,
    data: string,
    options: DenoNamespace.WriteFileOptions = {}
  ) {
    const encoder = new TextEncoder();
    return this.writeFileSync(path, encoder.encode(data), options);
  }

  writeTextFile(
    path: string | URL,
    data: string,
    options: DenoNamespace.WriteFileOptions = {}
  ) {
    const encoder = new TextEncoder();
    return this.writeFile(path, encoder.encode(data), options);
  }

  truncateSync(name: string, len?: number) {
    const { i, fs, rp, ap } = this.#accessMount(name, "truncateSync");
    if (fs && i) return fs.truncateSync(rp, len);

    this.#postMessage({ _t, fn: "truncate", sab: this.#sab, args: [ap, len] });
    this.#wait();
  }

  override truncate(name: string, len?: number) {
    const { i, fs, rp } = this.#accessMount(name, "truncate");
    if (fs) {
      if (i) return fs.truncate(rp, len);

      notImplemented();
    }

    return super.truncate(rp, len);
  }

  symlinkSync(
    oldpath: string | URL,
    newpath: string | URL,
    options?: DenoNamespace.SymlinkOptions
  ) {
    const { i, fs, rp, ap } = this.#accessMount(oldpath, "symlinkSync");
    const {
      fs: nfs,
      rp: nrp,
      ap: nap,
    } = this.#accessMount(newpath, "symlinkSync");

    if (fs !== nfs) notImplemented();
    if (fs && i) return fs.symlinkSync(rp, nrp, options);

    this.#postMessage({
      _t,
      fn: "symlink",
      sab: this.#sab,
      args: [ap, nap, options],
    });
    this.#wait();
  }

  symlink(
    oldpath: string | URL,
    newpath: string | URL,
    options?: DenoNamespace.SymlinkOptions
  ) {
    const { i, fs: oldFs, rp: oldp } = this.#accessMount(oldpath, "symlink");
    const { fs: newFs, rp: newp } = this.#accessMount(newpath, "symlink");

    if (oldFs !== newFs) notImplemented();
    if (oldFs) {
      if (i) return oldFs.symlink(oldp, newp, options);

      notImplemented();
    }

    notImplemented();
  }

  ftruncateSync(rid: number, len?: number) {
    const resc = this.#getResc(rid, "truncateSync");

    return resc.truncateSync(coerceLen(len));
  }

  ftruncate(rid: number, len?: number) {
    const resc = this.#getResc(rid, "truncate");

    return resc.truncate(coerceLen(len));
  }

  fstatSync(rid: number) {
    const resc = this.#getResc(rid, "statSync");
    return {
      atime: null,
      dev: null,
      mode: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,
      ...resc.statSync(),
    };
  }

  async fstat(rid: number) {
    const resc = this.#getResc(rid, "stat");
    return {
      atime: null,
      dev: null,
      mode: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,
      ...(await resc.stat()),
    };
  }

  #wait(sab = this.#sab) {
    const i32 = new Int32Array(sab);
    if (this.#canWait) Atomics.wait(i32, 0, 0, TIMEOUT);
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

  #accessMount<K extends keyof FileSystem>(path: string | URL, method: K) {
    const i = false as const;
    const ap = resolve(pathFromURL(path));
    const point = Object.keys(this.#mounts).find((v) => ap.startsWith(v));
    if (point) {
      const fs = this.#mounts[point];

      if (typeof fs[method] === "function") {
        return {
          i: true as const,
          rp: ap.slice(point.length + 1) || "/",
          fs: fs as FileSystem & { [key in K]: NonNullable<FileSystem[K]> },
          ap,
        };
      } else {
        return { i, rp: ap.slice(point.length + 1) || "/", fs, ap };
      }
    }
    return { i, rp: ap, ap };
  }

  #getResc<K extends keyof Resource>(rid: number, fn: K) {
    const resc = RESC_TABLE.get(rid);
    if (!resc) throw new NotFound(`rid: ${rid}`);
    if (typeof resc[fn] !== "function") notImplemented();

    return resc as Resource & { [key in K]: NonNullable<Resource[K]> };
  }
}

export type { UnionFileSystem };

export async function fsSyncHandler(fs: UnionFileSystem, msg: FSSyncMsg) {
  const i32 = new Int32Array(msg.sab);
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ret = await fs[msg.fn](...msg.args);

    let encoded: Uint8Array;
    if (typeof ret === "string") encoded = new TextEncoder().encode(ret);
    else if (typeof ret === "undefined" || ret === null) {
      // Must have length, or the main thread will wait forever.
      encoded = new Uint8Array(1);
    } else if (typeof ret === "object") {
      if (ret instanceof Uint8Array) encoded = ret;
      else if ("mtime" in ret) {
        encoded = new TextEncoder().encode(JSON.stringify(ret));
      } else {
        const dirs = [];
        for await (const dir of ret) dirs.push(dir);
        encoded = new TextEncoder().encode(JSON.stringify(dirs));
      }
    } else {
      encoded = new Uint8Array(1);
    }

    const u8 = new Uint8Array(msg.sab);
    u8.set(encoded, Int32Array.BYTES_PER_ELEMENT + 1);
    Atomics.store(i32, 0, encoded.length);
  } catch (err) {
    const { name, message } = err as Error;
    const str = JSON.stringify(<SyncError>{ name, msg: message });
    const encoded = new TextEncoder().encode(str);
    const u8 = new Uint8Array(msg.sab);
    u8.set(encoded, Int32Array.BYTES_PER_ELEMENT + 1);

    Atomics.store(i32, 0, -encoded.length);
  } finally {
    Atomics.notify(new Int32Array(msg.sab), 0);
  }
}

export async function hackDenoFS(postMessage: PostMessage) {
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
