import {
  AlreadyExists,
  Deno,
  FsFile,
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
import type { DBSchema, IDBPDatabase } from "idb";
import type {
  DenoNamespace,
  FileResource,
  FileSystem,
  Resource,
  RootFileSystem,
  SeekMode,
  StorageDevice,
} from "@griffon/deno-std";
import { DeviceFileSystem, FileAccessFileSystem, waitMsg } from ".";
import type { ProxyFileKey, ProxyFileMsg } from ".";
import type { FSSyncPostMessage } from "..";
import { ParentChildTp } from "..";
import { openDB } from "idb";
import { resolve } from "@griffon/deno-std/deno_std/path/posix";

type ChanMsg =
  | {
      fn: "newStorageDev";
      name: StorageDevice["name"];
      id: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: any[];
    }
  | { fn: "mount"; device: string; point: string }
  | { fn: "unmount"; point: string };

// eslint-disable-next-line @typescript-eslint/naming-convention
type Mounts = Record<string, FileSystem> & { "/dev": DeviceFileSystem };

interface MountSchema extends DBSchema {
  dev: {
    key: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: { name: StorageDevice["name"]; id: number; args: any[] };
  };
  mount: {
    key: number;
    value: { point: string; device: string };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    indexes: { "by-point": string };
  };
}

const _t = ParentChildTp.fsSync;

export class UnionFileSystem
  extends FileAccessFileSystem
  implements RootFileSystem
{
  private static _instance?: UnionFileSystem;

  readonly #db: IDBPDatabase<MountSchema>;

  readonly #sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 1024);

  readonly #postMessage: FSSyncPostMessage;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly #mounts: Mounts = { "/dev": new DeviceFileSystem() };

  readonly #channel = new BroadcastChannel("rootfs-sync");

  private constructor(
    root: FileSystemDirectoryHandle,
    db: IDBPDatabase<MountSchema>,
    postMessage: FSSyncPostMessage
  ) {
    super(root);

    this.#db = db;

    this.#postMessage = postMessage;
    this.#channel.onmessage = ({ data }: MessageEvent<ChanMsg>) => {
      switch (data.fn) {
        case "newStorageDev":
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          void this.#newStorageDev(data.name, data.id, ...data.args);
          break;
        case "mount":
          this.#mount(data.device, data.point);
          break;
        case "unmount":
          this.#unmount(data.point);
      }
    };
    this.#channel.onmessageerror = console.error;
  }

  static async create(postMessage: FSSyncPostMessage) {
    if (this._instance) return this._instance;

    const root = await navigator.storage.getDirectory();
    if ((await root.queryPermission({ mode: "readwrite" })) !== "granted") {
      if ((await root.requestPermission({ mode: "readwrite" })) !== "granted") {
        throw new Error("Permission denied");
      }
    }

    const db = await openDB<MountSchema>("rootfs-sync", 1, {
      upgrade(db) {
        db.createObjectStore("dev", { autoIncrement: true });
        const mount = db.createObjectStore("mount", { autoIncrement: true });
        mount.createIndex("by-point", "point", { unique: true });
      },

      terminated() {
        console.error("rootfs-sync db terminated");
      },
    });

    this._instance = new UnionFileSystem(root, db, postMessage);

    const devs = await db.getAll("dev");
    await Promise.all(
      devs.map(({ name, id, args }) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._instance!.#newStorageDev(name, id, args)
      )
    );

    const mounts = await db.getAll("mount");
    for (const { device, point } of mounts) {
      this._instance.#mount(device, point);
    }

    return this._instance;
  }

  async newStorageDev<D extends StorageDevice>(
    name: D["name"],
    id: number,
    ...args: Parameters<D["newDevice"]>
  ) {
    await this.#newStorageDev(name, id, ...args);

    const msg: ChanMsg = { fn: "newStorageDev", name, id, args };
    this.#channel.postMessage(msg);

    await this.#db.add("dev", { name, id, args });
  }

  #newStorageDev<D extends StorageDevice>(
    name: D["name"],
    id: number,
    ...args: Parameters<D["newDevice"]>
  ) {
    return this.#mounts["/dev"].newStorageDev(name, id, ...args);
  }

  async mount(deviceu: string | URL, pointu: string | URL) {
    const device = resolve(pathFromURL(deviceu));
    const point = resolve(pathFromURL(pointu));

    this.#mount(device, point);

    const msg: ChanMsg = { fn: "mount", device, point };
    this.#channel.postMessage(msg);

    await this.#db.add("mount", { device, point });
  }

  #mount(device: string, point: string) {
    if (Object.keys(this.#mounts).find((v) => point.startsWith(v)))
      throw new AlreadyExists(`mount '${point}'`);

    const dev = this.#mounts["/dev"].get(device.slice(5));
    if (!device.startsWith("/dev") || !dev)
      throw new Error(`invalid device '${device}'`);

    this.#mounts[point] = dev;
  }

  async unmount(pointu: string | URL) {
    const point = resolve(pathFromURL(pointu));

    this.#unmount(point);

    const msg: ChanMsg = { fn: "unmount", point };
    this.#channel.postMessage(msg);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const key = (await this.#db.getKeyFromIndex("mount", "by-point", point))!;
    await this.#db.delete("mount", key);
  }

  #unmount(point: string) {
    if (point === "/dev") throw new Error(`cannot unmount '/dev'`);

    delete this.#mounts[point];
  }

  linkSync(oldpath: string, newpath: string) {
    const { i, fs, rp, ap } = this.#accessMount(oldpath, "linkSync");
    const { fs: nFs, rp: np, ap: nap } = this.#accessMount(newpath, "linkSync");

    if (fs !== nFs) notImplemented();
    if (fs && i) return fs.linkSync(rp, np);

    this.#postMessage({ _t, fn: "link", sab: this.#sab, args: [ap, nap] });
    waitMsg(this.#sab);
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

    const { i, fs, rp, ap } = this.#accessMount(path, "openSync");
    if (fs && i) return fs.openSync(rp, options);

    const { port1, port2 } = new MessageChannel();
    this.#postMessage({ _t, fn: "open", sab: this.#sab, args: [ap, options] }, [
      port1,
    ]);
    waitMsg(this.#sab);

    const node = new ProxyFile(port2, this.#sab);
    const rid = RESC_TABLE.add(node);
    return new FsFile(rid);
  }

  override open(
    path: string | URL,
    options: DenoNamespace.OpenOptions = { read: true }
  ) {
    checkOpenOptions(options);

    const { i, fs, rp } = this.#accessMount(path, "open");
    if (fs) {
      if (i) return fs.open(rp, options);

      notImplemented();
    }

    return super.open(rp, options);
  }

  createSync(path: string | URL) {
    const { i, fs, rp } = this.#accessMount(path, "createSync");
    if (fs && i) return fs.createSync(rp);

    return this.openSync(path, {
      read: true,
      write: true,
      truncate: true,
      create: true,
    });
  }

  override create(path: string | URL) {
    const { i, fs, rp } = this.#accessMount(path, "create");
    if (fs) {
      if (i) return fs.create(rp);

      notImplemented();
    }

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
    waitMsg(this.#sab);
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
      waitMsg(this.#sab);
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
      waitMsg(this.#sab);
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
    waitMsg(this.#sab);
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
    waitMsg(this.#sab);
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
    const file = this.openSync(path);

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
    const ret = waitMsg(this.#sab);

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
      const ret = waitMsg(this.#sab);

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
      waitMsg(this.#sab);
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
    const ret = waitMsg(this.#sab);

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
    const ret = waitMsg(this.#sab);

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
    const ret = waitMsg(this.#sab);

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

    const file = this.openSync(path, openOptions);

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
    waitMsg(this.#sab);
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
    waitMsg(this.#sab);
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

class ProxyFile implements FileResource {
  readonly #port: MessagePort;

  readonly #sab: SharedArrayBuffer;

  constructor(port: MessagePort, sab: SharedArrayBuffer) {
    this.#port = port;
    this.#sab = sab;
  }

  get name() {
    return "fsFile" as const;
  }

  close() {
    this.#port.close();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.#port = undefined;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.#sab = undefined;
  }

  readSync(buffer: Uint8Array) {
    const sabBuf = new SharedArrayBuffer(buffer.byteLength);
    const u8Buf = new Uint8Array(sabBuf);

    this.#postMessage({ fn: "read", sab: this.#sab, args: [u8Buf] });
    const ret = waitMsg(this.#sab);

    const u8 = new Uint8Array(this.#sab);
    const start = Int32Array.BYTES_PER_ELEMENT + 1;
    const decoded = new TextDecoder().decode(u8.subarray(start, start + ret));
    const nread = JSON.parse(decoded) as number;

    buffer.set(u8Buf, nread);
    return nread;
  }

  read(buffer: Uint8Array) {
    return this.#chanMessage({ fn: "read", args: [buffer] }) as Promise<
      number | null
    >;
  }

  writeSync(p: Uint8Array) {
    this.#postMessage({ fn: "write", sab: this.#sab, args: [p] });
    const ret = waitMsg(this.#sab);

    const u8 = new Uint8Array(this.#sab);
    const start = Int32Array.BYTES_PER_ELEMENT + 1;
    const decoded = new TextDecoder().decode(u8.subarray(start, start + ret));
    return JSON.parse(decoded) as number;
  }

  write(buffer: Uint8Array) {
    return this.#chanMessage({
      fn: "write",
      args: [buffer],
    }) as Promise<number>;
  }

  syncSync() {
    // noop
  }

  async sync() {
    // noop
  }

  datasyncSync() {
    // noop
  }

  async datasync() {
    // noop
  }

  truncateSync(len: number) {
    this.#postMessage({ fn: "truncate", sab: this.#sab, args: [len] });
    waitMsg(this.#sab);
  }

  truncate(len: number) {
    return this.#chanMessage({ fn: "truncate", args: [len] }) as Promise<void>;
  }

  seekSync(offset: number, whence: SeekMode) {
    this.#postMessage({ fn: "seek", sab: this.#sab, args: [offset, whence] });
    const ret = waitMsg(this.#sab);

    const u8 = new Uint8Array(this.#sab);
    const start = Int32Array.BYTES_PER_ELEMENT + 1;
    const decoded = new TextDecoder().decode(u8.subarray(start, start + ret));
    return JSON.parse(decoded) as number;
  }

  seek(offset: number, whence: SeekMode) {
    return this.#chanMessage({
      fn: "seek",
      args: [offset, whence],
    }) as Promise<number>;
  }

  statSync() {
    this.#postMessage({ fn: "stat", sab: this.#sab, args: [] });
    const ret = waitMsg(this.#sab);

    const u8 = new Uint8Array(this.#sab);
    const start = Int32Array.BYTES_PER_ELEMENT + 1;
    const decoded = new TextDecoder().decode(u8.subarray(start, start + ret));
    return JSON.parse(decoded) as DenoNamespace.FileInfo;
  }

  stat() {
    return this.#chanMessage({
      fn: "stat",
      args: [],
    }) as Promise<DenoNamespace.FileInfo>;
  }

  #postMessage<K extends ProxyFileKey>(msg: ProxyFileMsg<K>) {
    this.#port.postMessage(msg);
  }

  #chanMessage<K extends ProxyFileKey>(msg: Omit<ProxyFileMsg<K>, "port">) {
    return new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      port1.onmessage = ({
        data,
      }: MessageEvent<{ ret: unknown } | { name: string; msg: string }>) => {
        if ("ret" in data) resolve(data.ret);
        else {
          const { name, msg } = data;
          // eslint-disable-next-line @typescript-eslint/naming-convention
          const Err = <ErrorConstructor>(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            (Deno.errors[name] ?? self[name] ?? Error)
          );
          reject(new Err(msg));
        }
        port1.close();
      };
      port1.onmessageerror = reject;
      this.#port.postMessage({ ...msg, port: port2 }, [port2]);
    });
  }
}
