import {
  AlreadyExists,
  FsFile,
  NotFound,
  RESC_TABLE,
  SeekMode,
  checkOpenOptions,
  concatBuffers,
  notImplemented,
  pathFromURL,
  readAll,
  readAllInnerSized,
} from "@griffon/deno-std";
import type { DBSchema, IDBPDatabase } from "idb";
import type {
  DenoNamespace,
  FileInfo,
  FileResource,
  FileSystem,
} from "@griffon/deno-std";
import { dirname, resolve } from "@griffon/deno-std/deno_std/path/posix";
import { newDirInfo, newFileInfo } from ".";
import { openDB } from "idb";

interface SFileInfo extends Omit<FileInfo, "ino"> {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymlink: boolean;
  size: number;
  readonly mtime: Date;
  readonly birthtime: Date;
  nlink: number;
}

interface FSSchema extends DBSchema {
  /**
   * Path to Ino.
   */
  tree: { key: string; value: number };
  /**
   * Ino to I-Node.
   */
  table: { key: number; value: SFileInfo };
  /**
   * Ino to File.
   */
  file: { key: number; value: ArrayBuffer };
  /**
   * Symlink table.
   */
  symlink: { key: number; value: number };
}

type DB = IDBPDatabase<FSSchema>;

async function trvSymlink(db: DB, ino: number, info: SFileInfo) {
  const table = db.transaction("table");
  const symlink = db.transaction("symlink");

  // TODO: Need to check cycles.
  // eslint-disable-next-line no-constant-condition
  while (ino && info.isSymlink) {
    ino = (await symlink.store.get(ino)) as number;
    if (!ino) throw new NotFound(`stat`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    info = (await table.store.get(ino))!;
  }

  return { ino, info };
}

type IDBFilePerms = Pick<
  DenoNamespace.OpenOptions,
  "read" | "write" | "append"
>;

const EXPIRY_TIME = 128;

/**
 * {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/runtime/ops/io.rs#L229}
 */
class IDBFile implements FileResource {
  #offset = 0;

  #data?: Uint8Array;

  #info?: SFileInfo;

  #dataId?: number;

  #infoId?: number;

  readonly #db: DB;

  readonly #ino: number;

  readonly #perms: IDBFilePerms;

  constructor(db: DB, ino: number, info: SFileInfo, perms: IDBFilePerms) {
    this.#db = db;
    this.#ino = ino;
    this.#perms = perms;

    this.#info = this.#getProxyInfo(info);
    this.#infoId = setTimeout(() => (this.#info = undefined), EXPIRY_TIME);
  }

  get name() {
    return "fsFile" as const;
  }

  close() {
    this.#data = undefined;
    this.#info = undefined;
    clearTimeout(this.#dataId);
    clearTimeout(this.#infoId);
  }

  readSync(buffer: Uint8Array): number {
    if (!this.#perms.read) throw new Error("Bad file descriptor (os error 9)");

    if (!this.#data) notImplemented();

    const data = this.#data.subarray(this.#offset);
    if (data.length === 0) return 0;

    let ret: number;
    if (buffer.length > data.length) {
      buffer.set(data);
      ret = data.length;
    } else {
      buffer.set(data.subarray(0, buffer.length));
      ret = buffer.length;
    }
    this.#offset += ret;
    return ret;
  }

  async read(buffer: Uint8Array): Promise<number> {
    if (!this.#perms.read) throw new Error("Bad file descriptor (os error 9)");

    await this.#tryGetData();

    return this.readSync(buffer);
  }

  async write(buffer: Uint8Array): Promise<number> {
    if (!this.#perms.write && !this.#perms.append)
      throw new Error("Bad file descriptor (os error 9)");

    if (this.#perms.write) {
      if (this.#offset === 0) {
        this.#data = new Uint8Array(buffer);
      } else {
        const thisData = await this.#tryGetData();

        this.#data = concatBuffers([
          thisData.subarray(0, this.#offset),
          buffer,
        ]);
      }
    } /* append */ else {
      const thisData = await this.#tryGetData();

      this.#data = concatBuffers([thisData, buffer]);
    }

    const thieInfo = await this.#tryGetInfo();
    thieInfo.size = this.#data.length;
    this.#offset = this.#data.length;
    await this.#db.put("file", this.#data, this.#ino);
    return buffer.length;
  }

  seekSync(offset: number, whence: SeekMode): number {
    let ret: number;

    if (whence === SeekMode.Start) ret = offset;
    else if (whence === SeekMode.Current) ret = this.#offset + offset;
    else if (whence === SeekMode.End) notImplemented();
    else throw new TypeError(`Invalid seek mode: ${whence as number}`);

    if (ret < 0) throw new TypeError("Invalid argument (os error 22)");

    this.#offset = ret;
    return ret;
  }

  async seek(offset: number, whence: SeekMode): Promise<number> {
    let ret: number;

    if (whence === SeekMode.Start) ret = offset;
    else if (whence === SeekMode.Current) ret = this.#offset + offset;
    else if (whence === SeekMode.End)
      ret = (await this.#tryGetInfo()).size + offset;
    else throw new TypeError(`Invalid seek mode: ${whence as number}`);

    if (ret < 0) throw new TypeError("Invalid argument (os error 22)");

    this.#offset = ret;
    return ret;
  }

  fstatSync() {
    if (!this.#info || this.#info.isSymlink) notImplemented();
    return { ...this.#info, ino: this.#ino };
  }

  async fstat() {
    const { ino, info } = await trvSymlink(
      this.#db,
      this.#ino,
      await this.#tryGetInfo()
    );
    return { ...info, ino };
  }

  #getProxyInfo(info: SFileInfo) {
    type Key = keyof SFileInfo;

    let infoLock = false;
    return new Proxy(info, {
      set: <K extends Key>(obj: SFileInfo, p: K, v: SFileInfo[K]) => {
        if (obj[p] !== v) {
          obj[p] = v;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore, the I-node is modified.
          obj.mtime = new Date();
          if (!infoLock) {
            infoLock = true;
            // Write back info to db every time we change it.
            // Use `queueMicrotask` or `setTimeout`?
            queueMicrotask(() => {
              void this.#db
                .put("table", obj, this.#ino)
                .then(() => (infoLock = false));
            });
          }
        }
        return true;
      },
    });
  }

  async #tryGetData() {
    if (this.#data) return this.#data;

    const data = await this.#db.get("file", this.#ino);
    if (!data) throw new NotFound(`ino: ${this.#ino}`);
    this.#data = new Uint8Array(data);

    clearTimeout(this.#dataId);
    this.#dataId = setTimeout(() => (this.#data = undefined), EXPIRY_TIME);

    return this.#data;
  }

  async #tryGetInfo() {
    if (this.#info) return this.#info;

    const info = await this.#db.get("table", this.#ino);
    if (!info) throw new NotFound(`ino: ${this.#ino}`);
    this.#info = this.#getProxyInfo(info);

    clearTimeout(this.#infoId);
    this.#infoId = setTimeout(() => (this.#info = undefined), EXPIRY_TIME);

    return this.#info;
  }
}

export class IDBFileSystem implements FileSystem {
  #db!: DB;

  constructor(version: number) {
    void openDB<FSSchema>("fs", version, {
      upgrade(db) {
        const tree = db.createObjectStore("tree");
        const table = db.createObjectStore("table", { autoIncrement: true });
        db.createObjectStore("file");
        db.createObjectStore("symlink");
        table
          .add(newDirInfo())
          .then((ino) => tree.add(ino, "/")) // Add root dir.
          .catch(console.error);
      },

      terminated() {
        console.error("Database was terminated");
      },
    }).then((db) => (this.#db = db));
  }

  async link(oldpath: string, newpath: string) {
    const oldp = resolve(oldpath);
    const newp = resolve(newpath);

    let ino: number | undefined;
    {
      const tx = this.#db.transaction("tree", "readwrite");

      let newKey: string | undefined;
      [ino, newKey] = await Promise.all([
        tx.store.get(oldp),
        tx.store.getKey(newp),
      ]);
      if (!ino) throw new NotFound(`link '${oldp}'`);
      if (newKey === newp)
        throw new AlreadyExists(`link '${oldpath}' -> '${newpath}'`);

      await Promise.all([tx.store.add(ino, newp), tx.done]);
    }

    const tx = this.#db.transaction("table", "readwrite");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const info = (await tx.store.get(ino))!;
    // Shall we update the mtime?
    info.nlink += 1;
    await Promise.all([tx.store.put(info, ino), tx.done]);
  }

  async open(
    path: string | URL,
    options: DenoNamespace.OpenOptions = { read: true }
  ): Promise<FsFile> {
    checkOpenOptions(options);
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    let ino: number | undefined;
    let info: SFileInfo | undefined;
    {
      const tree = this.#db.transaction("tree", "readwrite");
      const table = this.#db.transaction("table", "readwrite");
      const file = this.#db.transaction("file", "readwrite");

      ino = await tree.store.get(absPath);
      if (!ino) {
        if (!options.create && !options.createNew)
          throw new NotFound(`open '${pathStr}'`);

        info = newFileInfo();
        ino = await table.store.add(info);
        void tree.store.add(ino, absPath);
        void file.store.add(new ArrayBuffer(0), ino);
      } else {
        if (options.createNew) throw new AlreadyExists(`open '${pathStr}'`);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        info = (await table.store.get(ino))!;

        if (info.isDirectory) {
          if (options.append || options.write || options.truncate)
            throw new Error(`Is a directory (os error 21), open '${pathStr}'`);
        } else if (info.isFile) {
          if (options.truncate) {
            info.size = 0;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore, the I-node is modified.
            info.mtime = new Date();
            void table.store.put(info, ino);
            void file.store.add(new ArrayBuffer(0), ino);
          }
        } else if (info.isSymlink) {
          // TODO
        }
      }

      // Need it?
      await Promise.all([tree.done, table.done, file.done]);
    }

    const node = new IDBFile(this.#db, ino, info, options);
    const rid = RESC_TABLE.add(node);
    return new FsFile(rid);
  }

  create(path: string | URL) {
    return this.open(path, {
      read: true,
      write: true,
      truncate: true,
      create: true,
    });
  }

  readSync(rid: number, buffer: Uint8Array): number | null {
    if (buffer.length === 0) return 0;

    const resc = this.#getResc(rid);

    const nread = resc.readSync(buffer);
    return nread === 0 ? null : nread;
  }

  async read(rid: number, buffer: Uint8Array): Promise<number | null> {
    if (buffer.length === 0) return 0;

    const resc = this.#getResc(rid);

    const nread = await resc.read(buffer);
    return nread === 0 ? null : nread;
  }

  async write(rid: number, data: Uint8Array): Promise<number> {
    const resc = this.#getResc(rid);

    return await resc.write(data);
  }

  seekSync(rid: number, offset: number, whence: SeekMode): number {
    const resc = this.#getResc(rid);

    return resc.seekSync(offset, whence);
  }

  async seek(rid: number, offset: number, whence: SeekMode): Promise<number> {
    const resc = this.#getResc(rid);

    return await resc.seek(offset, whence);
  }

  fsyncSync(/* rid: number */): void {
    // noop
  }

  async fsync(/* rid: number */): Promise<void> {
    // noop
  }

  fdatasyncSync(/* rid: number */): void {
    // noop
  }

  async fdatasync(/* rid: number */): Promise<void> {
    // noop
  }

  async mkdir(path: string | URL, options?: DenoNamespace.MkdirOptions) {
    const pathStr = pathFromURL(path);
    const cur = resolve(pathStr);

    if (options?.recursive) {
      let dirIno: number | undefined;
      const dirs = [cur];
      // Get the most top directory.
      {
        const tx = this.#db.transaction("tree", "readonly");

        const curKey = await tx.store.getKey(cur);
        if (curKey) throw new AlreadyExists(`mkdir '${pathStr}'`);

        let dir = cur;
        do {
          dir = dirname(dir);
          dirs.push(dir);
          dirIno = await tx.store.get(dir);
        } while (!dirIno);
        dirs.pop();

        await tx.done;
      }
      // Create directories.
      let dirInos: number[];
      {
        const tx = this.#db.transaction("table", "readwrite");
        const dirInfo = await tx.store.get(dirIno);

        if (!dirInfo?.isDirectory)
          throw new Error(`Not a directory (os error 20), mkdir '${pathStr}'`);

        const info = newDirInfo();
        dirInos = await Promise.all(dirs.map(() => tx.store.add(info)));

        await tx.done;
      }
      // Store ino in tree.
      {
        const tx = this.#db.transaction("tree", "readwrite");

        await Promise.all([
          ...dirs.map((dir, idx) => tx.store.add(dirInos[idx], dir)),
          tx.done,
        ]);
      }
    } else {
      const dir = dirname(cur);
      let dirIno: number | undefined;
      {
        const tx = this.#db.transaction("tree", "readonly");
        let curKey: string | undefined;
        [dirIno, curKey] = await Promise.all([
          tx.store.get(dir),
          tx.store.getKey(cur),
          tx.done,
        ]);

        if (!dirIno) throw new NotFound(`mkdir '${pathStr}'`);
        if (curKey) throw new AlreadyExists(`mkdir '${pathStr}'`);
      }

      const tx = this.#db.transaction("table", "readwrite");
      const dirInfo = await tx.store.get(dirIno);

      if (!dirInfo?.isDirectory)
        throw new Error(`Not a directory (os error 20), mkdir '${pathStr}'`);

      const ino = await tx.store.add(newDirInfo());

      await Promise.all([this.#db.add("tree", ino, cur), tx.done]);
    }
  }

  chmodSync(/* path: string | URL, mode: number */) {
    // noop
  }

  async chmod(/* path: string | URL, mode: number */) {
    // noop
  }

  chownSync(/* path: string | URL, uid: number | null, gid: number | null */) {
    // noop
  }

  async chown(/* path: string | URL, uid: number | null, gid: number | null */) {
    // noop
  }

  async remove(path: string | URL, options?: DenoNamespace.RemoveOptions) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const tree = this.#db.transaction("tree", "readwrite");

    const ino = await tree.store.get(absPath);
    if (!ino) throw new NotFound(`remove '${pathStr}'`);

    const table = this.#db.transaction("table", "readwrite");
    const file = this.#db.transaction("file", "readwrite");

    const unlink = (path: string, ino: number, info: SFileInfo) => {
      // Shall we update the mtime?
      info.nlink -= 1;
      const del = tree.store.delete(path);
      return Promise.all(
        info.nlink <= 0
          ? /**
             * The difference between `file` and `symlink` is that `symlink`
             * do not delete the content. Because there is no file.
             */
            [del, table.store.delete(ino), file.store.delete(ino)]
          : [del, table.store.put(info, ino)]
      );
    };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const info = (await table.store.get(ino))!;

    if (info.isFile || info.isSymlink) {
      await unlink(absPath, ino, info);
    } else if (info.isDirectory) {
      if (options?.recursive) {
        // TODO
      } else {
        // TODO
      }
    } else {
      // TODO
    }

    await Promise.all([tree.done, table.done, file.done]);
  }

  async rename(oldpath: string | URL, newpath: string | URL) {
    const oldpathStr = pathFromURL(oldpath);
    const absOldPath = resolve(oldpathStr);
    const newpathStr = pathFromURL(newpath);
    const absNewPath = resolve(newpathStr);

    const tx = this.#db.transaction("tree", "readwrite");
    const oldIno = await tx.store.get(absOldPath);
    if (!oldIno)
      throw new NotFound(`rename '${oldpathStr}' -> '${absNewPath}'`);

    const newIno = await tx.store.get(absOldPath);
    if (newIno) await this.remove(absNewPath);

    await Promise.all([
      tx.store.delete(absOldPath),
      tx.store.add(oldIno, absNewPath),
      tx.done,
    ]);
  }

  async readTextFile(
    path: string | URL,
    options?: DenoNamespace.ReadFileOptions
  ) {
    return new TextDecoder().decode(await this.readFile(path, options));
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

  async realPath(path: string | URL) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const ino = await this.#db.get("tree", absPath);
    if (!ino) throw new NotFound(`realpath '${pathStr}'`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const info = (await this.#db.get("table", ino))!;
    if (info.isSymlink) return await this.readLink(path);

    return absPath;
  }

  readDir(path: string | URL): AsyncIterable<DenoNamespace.DirEntry> {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const tree = this.#db.transaction("tree", "readonly");
    const table = this.#db.transaction("table", "readonly");
    return {
      async *[Symbol.asyncIterator]() {
        const range = IDBKeyRange.lowerBound(`${absPath}/`, true);
        const cur = await tree.store.openCursor(range);
        if (!cur) return;

        do {
          if (!cur.key.startsWith(absPath)) {
            await Promise.all([tree.done, table.done]);
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const { isDirectory, isFile, isSymlink } = (await table.store.get(
            cur.value
          ))!;
          const name = cur.key.slice(absPath.length + 1);

          yield { name, isDirectory, isFile, isSymlink };
        } while (await cur.advance(1));
      },
    };
  }

  async readLink(path: string | URL) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const ino = await this.#db.get("tree", absPath);
    if (!ino) throw new NotFound(`readlink '${pathStr}'`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const info = (await this.#db.get("table", ino))!;
    if (!info.isSymlink)
      throw new TypeError(
        `Invalid argument (os error 22), readlink '${pathStr}'`
      );

    // TODO: ino index
    notImplemented();

    return "";
  }

  async lstat(path: string | URL) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const ino = await this.#db.get("tree", absPath);
    if (!ino) throw new NotFound(`lstat '${pathStr}'`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const info = (await this.#db.get("table", ino))!;

    return {
      atime: null,
      dev: null,
      mode: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,

      ...info,
      ino,
    };
  }

  async stat(path: string | URL) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    let ino = await this.#db.get("tree", absPath);
    if (!ino) throw new NotFound(`lstat '${pathStr}'`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let info = (await this.#db.get("table", ino))!;

    ({ ino, info } = await trvSymlink(this.#db, ino, info));

    return {
      atime: null,
      dev: null,
      mode: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,

      ...info,
      ino,
    };
  }

  async writeFile(
    path: string | URL,
    data: Uint8Array,
    options: DenoNamespace.WriteFileOptions = {}
  ) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    if (options.create !== undefined) {
      const create = !!options.create;
      if (!create) {
        // verify that file exists
        await this.stat(absPath);
      }
    }

    const openOptions = options.append
      ? { write: true, create: true, append: true }
      : { write: true, create: true, truncate: true };
    const file = await this.open(absPath, openOptions);

    /* if (
      options.mode !== undefined &&
      options.mode !== null &&
      build.os !== "windows"
    ) {
      await chmod(path, options.mode);
    } */

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

  async writeTextFile(
    path: string | URL,
    data: string,
    options: DenoNamespace.WriteFileOptions = {}
  ) {
    const encoder = new TextEncoder();
    return this.writeFile(path, encoder.encode(data), options);
  }

  async truncate(name: string, len = 0) {
    const absPath = resolve(name);

    const ino = await this.#db.get("tree", absPath);
    if (!ino) throw new NotFound(`truncate '${name}'`);

    const table = this.#db.transaction("table", "readwrite");
    const file = this.#db.transaction("file", "readwrite");

    const [info, data] = (await Promise.all([
      table.store.get(ino),
      file.store.get(ino),
    ])) as [SFileInfo, Uint8Array];

    if (len < data.length) {
      await Promise.all([
        table.store.put({ ...info, size: len, mtime: new Date() }),
        file.store.put(data.subarray(0, len)),
      ]);
    }

    await Promise.all([table.done, file.done]);
  }

  #getResc(rid: number): IDBFile {
    const resc = RESC_TABLE.get(rid);
    if (!(resc instanceof IDBFile)) throw new NotFound(`rid: ${rid}`);
    return resc;
  }
}
