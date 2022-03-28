import {
  AlreadyExists,
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
} from "@griffon/deno-std";
import { FileAccessFileSystem } from ".";
import { resolve } from "@griffon/deno-std/deno_std/path/posix";

class DeviceFileSystem implements FileSystem {
  #tree = new Map<string, FileSystem>();

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

  readDirSync(path: string | URL) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const tree = this.#tree;
    return {
      *[Symbol.iterator]() {
        for (const path of tree.keys()) {
          if (!path.startsWith(absPath)) continue;
          const name = path.slice(absPath.length + 1);
          if (name.includes("/")) continue;
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
          if (name.includes("/")) continue;
          yield { name, isFile: false, isDirectory: false, isSymlink: false };
        }
      },
    };
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
type Mounts = Record<string, FileSystem> & { "/dev": DeviceFileSystem };

export class UnionFileSystem
  extends FileAccessFileSystem
  implements RootFileSystem
{
  private static _instance?: UnionFileSystem;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  #mounts: Mounts = { "/dev": new DeviceFileSystem() };

  private constructor(root: FileSystemDirectoryHandle) {
    super(root);
  }

  static async create() {
    if (this._instance) return this._instance;

    const root = await navigator.storage.getDirectory();
    if ((await root.queryPermission({ mode: "readwrite" })) !== "granted") {
      if ((await root.requestPermission({ mode: "readwrite" })) !== "granted") {
        throw new Error("Permission denied");
      }
    }
    return (this._instance = new UnionFileSystem(root));
  }

  mount(device: string | URL, point: string | URL) {
    const pointStr = pathFromURL(point);
    const absPoint = resolve(pointStr);

    if (Object.keys(this.#mounts).find((v) => v.startsWith(absPoint)))
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
    const { fs: oldFs, rp: oldp } = this.#accessMount(oldpath, "linkSync");
    const { fs: newFs, rp: newp } = this.#accessMount(newpath, "linkSync");

    if (oldFs !== newFs) notImplemented();
    if (oldFs) return oldFs.linkSync(oldp, newp);

    notImplemented();
  }

  link(oldpath: string, newpath: string) {
    const { fs: oldFs, rp: oldp } = this.#accessMount(oldpath, "link");
    const { fs: newFs, rp: newp } = this.#accessMount(newpath, "link");

    if (oldFs !== newFs) notImplemented();
    if (oldFs) return oldFs.link(oldp, newp);

    notImplemented();
  }

  openSync(
    path: string | URL,
    options: DenoNamespace.OpenOptions = { read: true }
  ) {
    checkOpenOptions(options);

    const { fs, rp } = this.#accessMount(path, "openSync");
    if (fs) return fs.openSync(rp, options);

    notImplemented();
  }

  override open(
    path: string | URL,
    options: DenoNamespace.OpenOptions = { read: true }
  ) {
    checkOpenOptions(options);

    const { fs, rp } = this.#accessMount(path, "open");
    if (fs) return fs.open(rp, options);

    return super.open(rp, options);
  }

  createSync(path: string | URL) {
    const { fs, rp } = this.#accessMount(path, "createSync");
    if (fs) return fs.createSync(rp);

    notImplemented();
  }

  override create(path: string | URL) {
    const { fs, rp } = this.#accessMount(path, "create");
    if (fs) return fs.create(rp);

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
    const { fs, rp } = this.#accessMount(path, "mkdirSync");
    if (fs) return fs.mkdirSync(rp, options);

    notImplemented();
  }

  override mkdir(path: string | URL, options?: DenoNamespace.MkdirOptions) {
    const { fs, rp } = this.#accessMount(path, "mkdir");
    if (fs) return fs.mkdir(rp, options);

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
    const { fs, rp } = this.#accessMount(path, "chmodSync");
    if (fs) return fs.chmodSync(rp, mode);

    return super.chmodSync(rp, mode);
  }

  override chmod(path: string | URL, mode: number) {
    const { fs, rp } = this.#accessMount(path, "chmod");
    if (fs) return fs.chmod(rp, mode);

    return super.chmod(rp, mode);
  }

  override chownSync(
    path: string | URL,
    uid: number | null,
    gid: number | null
  ) {
    const { fs, rp } = this.#accessMount(path, "chownSync");
    if (fs) return fs.chownSync(rp, uid, gid);

    return super.chownSync(rp, uid, gid);
  }

  override chown(path: string | URL, uid: number | null, gid: number | null) {
    const { fs, rp } = this.#accessMount(path, "chown");
    if (fs) return fs.chown(rp, uid, gid);

    return super.chown(rp, uid, gid);
  }

  removeSync(path: string | URL, options?: DenoNamespace.RemoveOptions) {
    const { fs, rp } = this.#accessMount(path, "removeSync");
    if (fs) return fs.removeSync(rp, options);

    notImplemented();
  }

  override remove(path: string | URL, options?: DenoNamespace.RemoveOptions) {
    const { fs, rp } = this.#accessMount(path, "remove");
    if (fs) return fs.remove(rp, options);

    return super.remove(rp, options);
  }

  renameSync(oldpath: string | URL, newpath: string | URL) {
    const { fs: oldFs, rp: oldp } = this.#accessMount(oldpath, "renameSync");
    const { fs: newFs, rp: newp } = this.#accessMount(newpath, "renameSync");

    if (oldFs !== newFs) notImplemented();
    if (oldFs) return oldFs.renameSync(oldp, newp);

    notImplemented();
  }

  override rename(oldpath: string | URL, newpath: string | URL) {
    const { fs: oldFs, rp: oldp } = this.#accessMount(oldpath, "rename");
    const { fs: newFs, rp: newp } = this.#accessMount(newpath, "rename");

    if (oldFs !== newFs) notImplemented();
    if (oldFs) return oldFs.rename(oldp, newp);

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
    const { fs, rp } = this.#accessMount(path, "realPathSync");
    if (fs) return fs.realPathSync(rp);

    notImplemented();
  }

  realPath(path: string | URL) {
    const { fs, rp } = this.#accessMount(path, "realPath");
    if (fs) return fs.realPath(rp);

    notImplemented();
  }

  readDirSync(path: string | URL) {
    const absPath = resolve(pathFromURL(path));
    const { fs, rp } = this.#accessMount(absPath, "readDirSync");

    const mounts = Object.entries(this.#mounts);

    return {
      *[Symbol.iterator]() {
        if (fs) {
          for (const entry of fs.readDirSync(rp)) yield entry;
        }

        for (const [path, fs] of mounts) {
          if (
            typeof fs.readDirSync !== "function" ||
            !path.startsWith(absPath) ||
            path.slice(absPath.length + 1).includes("/")
          )
            continue;

          for (const entry of fs.readDirSync("/")) yield entry;
        }
      },
    };
  }

  override readDir(path: string | URL) {
    const absPath = resolve(pathFromURL(path));
    const { fs, rp } = this.#accessMount(path, "readDir");

    const iter = fs ? fs.readDir(rp) : super.readDir(rp);
    const mounts = Object.entries(this.#mounts);

    return {
      async *[Symbol.asyncIterator]() {
        for await (const entry of iter) yield entry;

        for (const [path, fs] of mounts) {
          if (
            typeof fs.readDir !== "function" ||
            !path.startsWith(absPath) ||
            path.slice(absPath.length + 1).includes("/")
          )
            continue;

          for await (const entry of fs.readDir("/")) yield entry;
        }
      },
    };
  }

  copyFileSync(fromPath: string | URL, toPath: string | URL) {
    const { fs: fromFs, rp: fromp } = this.#accessMount(
      fromPath,
      "copyFileSync"
    );
    const { fs: toFs, rp: top } = this.#accessMount(toPath, "copyFileSync");

    if (fromFs !== toFs) {
      if (!fromFs || !toFs) throw new NotFound(`copy '${fromp}' -> '${top}'`);
      const data = this.readFileSync(fromPath);
      this.writeFileSync(toPath, data);
    } else {
      if (fromFs) return fromFs.copyFileSync(fromp, top);
    }

    notImplemented();
  }

  override async copyFile(fromPath: string | URL, toPath: string | URL) {
    const { fs: fromFs, rp: fromp } = this.#accessMount(fromPath, "copyFile");
    const { fs: toFs, rp: top } = this.#accessMount(toPath, "copyFile");

    if (fromFs !== toFs) {
      if (!fromFs || !toFs) throw new NotFound(`copy '${fromp}' -> '${top}'`);
      if (typeof fromFs.open !== "function" || typeof toFs.open !== "function")
        notImplemented();

      const fromFile = await fromFs.open(fromp);
      const toFile = await fromFs.open(top, { write: true, create: true });

      await fromFile.readable.pipeTo(toFile.writable);
    } else {
      if (fromFs) return fromFs.copyFile(fromp, top);
    }

    return super.copyFile(fromp, top);
  }

  readLinkSync(path: string | URL) {
    const { fs, rp } = this.#accessMount(path, "readLinkSync");
    if (fs) return fs.readLinkSync(rp);

    notImplemented();
  }

  readLink(path: string | URL) {
    const { fs, rp } = this.#accessMount(path, "readLink");
    if (fs) return fs.readLink(rp);

    notImplemented();
  }

  lstatSync(path: string | URL) {
    const { fs, rp } = this.#accessMount(path, "lstatSync");
    if (fs) return fs.lstatSync(rp);

    notImplemented();
  }

  override lstat(path: string | URL) {
    const { fs, rp } = this.#accessMount(path, "lstat");
    if (fs) return fs.lstat(rp);

    return super.lstat(rp);
  }

  statSync(path: string | URL) {
    const { fs, rp } = this.#accessMount(path, "statSync");
    if (fs) return fs.statSync(rp);

    notImplemented();
  }

  override stat(path: string | URL) {
    const { fs, rp } = this.#accessMount(path, "stat");
    if (fs) return fs.stat(rp);

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
    const { fs, rp } = this.#accessMount(name, "truncateSync");
    if (fs) return fs.truncateSync(rp, len);

    notImplemented();
  }

  override truncate(name: string, len?: number) {
    const { fs, rp } = this.#accessMount(name, "truncate");
    if (fs) return fs.truncate(rp, len);

    return super.truncate(rp, len);
  }

  symlinkSync(
    oldpath: string | URL,
    newpath: string | URL,
    options?: DenoNamespace.SymlinkOptions
  ) {
    const { fs: oldFs, rp: oldp } = this.#accessMount(oldpath, "symlinkSync");
    const { fs: newFs, rp: newp } = this.#accessMount(newpath, "symlinkSync");

    if (oldFs !== newFs) notImplemented();
    if (oldFs) return oldFs.symlinkSync(oldp, newp, options);

    notImplemented();
  }

  symlink(
    oldpath: string | URL,
    newpath: string | URL,
    options?: DenoNamespace.SymlinkOptions
  ) {
    const { fs: oldFs, rp: oldp } = this.#accessMount(oldpath, "symlink");
    const { fs: newFs, rp: newp } = this.#accessMount(newpath, "symlink");

    if (oldFs !== newFs) notImplemented();
    if (oldFs) return oldFs.symlink(oldp, newp, options);

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
    const rp = resolve(pathFromURL(path));

    const point = Object.keys(this.#mounts).find((v) => v.startsWith(rp));
    if (point) {
      const fs = this.#mounts[point];

      if (typeof fs[method] === "function")
        return {
          rp: rp.slice(point.length + 1) || "/",
          fs: fs as FileSystem & { [key in K]: NonNullable<FileSystem[K]> },
        };
    }
    return { rp };
  }

  #getResc<K extends keyof Resource>(rid: number, fn: K) {
    const resc = RESC_TABLE.get(rid);
    if (!resc) throw new NotFound(`rid: ${rid}`);
    if (typeof resc[fn] !== "function") notImplemented();

    return resc as Resource & { [key in K]: NonNullable<Resource[K]> };
  }
}
