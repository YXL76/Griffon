import {
  AlreadyExists,
  Busy,
  FsFile,
  NotFound,
  RESC_TABLE,
  SeekMode,
  checkOpenOptions,
  notImplemented,
  pathFromURL,
} from "@griffon/deno-std";
import type { DBSchema, IDBPDatabase } from "idb";
import type {
  DenoNamespace,
  FileInfo,
  FileResource,
  FileSystem,
} from "@griffon/deno-std";
import { dirname, resolve } from "@griffon/deno-std/deno_std/path/posix";
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

type IDBFilePerms = Pick<
  DenoNamespace.OpenOptions,
  "read" | "write" | "append"
>;

type InfoMapVal = {
  info: SFileInfo;
  /**
   * Opened file count.
   */
  count: number;
};

/**
 * Sync `FileInfo` among all opened files.
 */
class InfoMap {
  readonly #map = new Map<number, InfoMapVal>();

  readonly #db: IDBPDatabase<FSSchema>;

  constructor(db: IDBPDatabase<FSSchema>) {
    this.#db = db;
  }

  async open<T extends SFileInfo>(ino: number, preInfo: T) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let linkIno = preInfo.isSymlink
      ? undefined
      : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (await this.#db.get("symlink", ino))!;

    const val = this.#map.get(ino);
    if (val) {
      this.#map.set(ino, { info: preInfo, count: val.count + 1 });
    } else {
      let infoLock = false;
      type Key = keyof SFileInfo;
      const info = new Proxy(preInfo, {
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
                  .put("table", obj, ino)
                  .then(() => (infoLock = false));
              });
            }
          }
          return true;
        },
      });
      this.#map.set(ino, { info, count: 1 });
    }

    if (linkIno) {
      // The info may be empty.
      const linkInfo = await this.#db.get("table", ino);
      if (linkInfo) await this.open(linkIno, linkInfo);
      else linkIno = undefined;
    }
    return linkIno;
  }

  close(ino: number) {
    const val = this.#map.get(ino);
    if (!val) throw new Error("FileInfo not found");
    if (val.count <= 1) this.#map.delete(ino);
    else val.count -= 1;

    if (val.info.isSymlink) {
      this.#db
        .get("symlink", ino)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .then((ino) => this.close(ino!))
        .catch(console.error);
    }
  }

  get(ino: number) {
    return this.#map.get(ino)?.info;
  }

  has(ino: number) {
    return this.#map.has(ino);
  }
}

/**
 * {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/runtime/ops/io.rs#L229}
 */
class IDBFile implements FileResource {
  #offset = 0;

  #data?: Uint8Array;

  /**
   * Only used by SymLink.
   */
  #realIno?: number;

  readonly #db: IDBPDatabase<FSSchema>;

  readonly #infoMap: InfoMap;

  readonly #ino: number;

  readonly #perms: IDBFilePerms;

  constructor(
    db: IDBPDatabase<FSSchema>,
    ino: number,
    /**
     * Pre-stat data.
     */
    info: SFileInfo,
    infoMap: InfoMap,
    perms: IDBFilePerms
  ) {
    this.#db = db;
    this.#ino = ino;
    this.#infoMap = infoMap;
    this.#perms = perms;

    this.#infoMap
      .open(this.#ino, info)
      .then((realIno) => (this.#realIno = realIno))
      .catch(console.error);
  }

  get name() {
    return "fsFile" as const;
  }

  close() {
    this.#data = undefined;
    this.#infoMap.close(this.#ino);
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

    if (!this.#data) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.#data = new Uint8Array((await this.#db.get("file", this.#ino))!);
    }

    return this.readSync(buffer);
  }

  async write(buffer: Uint8Array): Promise<number> {
    if (!this.#perms.write && !this.#perms.append)
      throw new Error("Bad file descriptor (os error 9)");

    if (!this.#data) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.#data = new Uint8Array((await this.#db.get("file", this.#ino))!);
    }

    if (this.#perms.write) {
      if (this.#offset === 0) {
        this.#data = new Uint8Array(buffer);
      } else {
        const resv = this.#data.subarray(0, this.#offset);
        const data = new Uint8Array(resv.length + buffer.length);
        data.set(resv);
        data.set(buffer, resv.length);
        this.#data = data;
      }
    } /* append */ else {
      const data = new Uint8Array(this.#data.length + buffer.length);
      data.set(this.#data);
      data.set(buffer, this.#data.length);
      this.#data = data;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.#infoMap.get(this.#ino)!.size = this.#data.length;
    this.#offset = this.#data.length;
    await this.#db.put("file", this.#data, this.#ino);
    return buffer.length;
  }

  seekSync(offset: number, whence: SeekMode): number {
    let ret: number;

    if (whence === SeekMode.Start) ret = offset;
    else if (whence === SeekMode.Current) ret = this.#offset + offset;
    else if (whence === SeekMode.End)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ret = this.#infoMap.get(this.#ino)!.size + offset;
    else throw new TypeError(`Invalid seek mode: ${whence as number}`);

    if (ret < 0) throw new TypeError("Invalid argument (os error 22)");

    this.#offset = ret;
    return ret;
  }

  seek(offset: number, whence: SeekMode): Promise<number> {
    try {
      return Promise.resolve(this.seekSync(offset, whence));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  fstatSync() {
    let info = this.#infoMap.get(this.#ino);
    if (info?.isSymlink) {
      if (!this.#realIno) notImplemented(); // TODO
      info = this.#infoMap.get(this.#realIno);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { ...info!, ino: this.#ino };
  }

  fstat() {
    return Promise.resolve(this.fstatSync());
  }
}

export class IDBFileSystem implements FileSystem {
  #db!: IDBPDatabase<FSSchema>;

  #infoMap!: InfoMap;

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
    }).then((db) => {
      this.#db = db;
      this.#infoMap = new InfoMap(db);
    });
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

    const node = new IDBFile(this.#db, ino, info, this.#infoMap, options);
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

  async remove(path: string | URL, options?: DenoNamespace.RemoveOptions) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const tree = this.#db.transaction("tree", "readwrite");

    const ino = await tree.store.get(absPath);
    if (!ino) throw new NotFound(`remove '${pathStr}'`);
    if (this.#infoMap.has(ino)) throw new Busy(`remove '${pathStr}'`);

    const table = this.#db.transaction("table", "readwrite");

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const info = (await table.store.get(ino))!;

    if (info.isFile || info.isSymlink) {
      if (info.nlink <= 1) {
        await Promise.all([
          tree.store.delete(absPath),
          table.store.delete(ino),
          /**
           * The difference between `file` and `symlink` is that `symlink`
           * do not delete the content. Because there is no file.
           */
          this.#db.delete("file", ino),
          tree.done,
          table.done,
        ]);
      } else {
        info.nlink -= 1;
        await Promise.all([
          tree.store.delete(absPath),
          table.store.put(info, ino),
          tree.done,
          table.done,
        ]);
      }
    } else if (info.isDirectory) {
      if (options?.recursive) {
        // TODO
      } else {
        // TODO
      }
    } else {
      // TODO
    }
  }

  #getResc(rid: number): IDBFile {
    const resc = RESC_TABLE.get(rid);
    if (!(resc instanceof IDBFile)) throw new NotFound(`rid: ${rid}`);
    return resc;
  }
}

function newFileInfo() {
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

function newDirInfo() {
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
