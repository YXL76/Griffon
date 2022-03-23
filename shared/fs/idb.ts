import {
  AlreadyExists,
  FileResource,
  FsFile,
  NotFound,
  checkOpenOptions,
} from "@griffon/deno-std";
import type { DBSchema, IDBPDatabase } from "idb";
import type { DenoFsMethodsAsync, DenoType, FileInfo } from "@griffon/deno-std";
import { fromFileUrl, resolve } from "@griffon/deno-std/deno_std/path/posix";
import { openDB } from "idb";

interface FSSchema extends DBSchema {
  /**
   * Path to Ino.
   */
  tree: {
    key: string;
    value: number;
  };
  /**
   * Ino to I-Node.
   */
  table: {
    key: number;
    value: FileInfo;
  };
  /**
   * Ino to File.
   */
  file: {
    key: number;
    value: ArrayBuffer;
  };
  /* products: {
    value: {
      name: string;
      price: number;
      productCode: string;
    };
    key: string;
    indexes: { "by-price": number };
  }; */
}

/**
 * {@link https://github.com/denoland/deno/blob/1fb5858009f598ce3f917f9f49c466db81f4d9b0/runtime/ops/io.rs#L229}
 */
class IDBFile extends FileResource {
  #data?: ArrayBuffer;

  #info: FileInfo;

  constructor(info: FileInfo) {
    super();
    this.#info = info;
  }

  get info() {
    return this.#info;
  }

  close() {
    this.#data = undefined;
  }
}

export class IDBFileSystem
  implements Pick<typeof DenoType, DenoFsMethodsAsync>
{
  #db!: IDBPDatabase<FSSchema>;

  constructor(version: number) {
    void openDB<FSSchema>("fs", version, {
      upgrade(db) {
        db.createObjectStore("tree");
        db.createObjectStore("table");
        db.createObjectStore("file", { autoIncrement: true });

        // Take place for ino 0.
        void db.add("file", new ArrayBuffer(0));
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
      if (!ino) throw new NotFound(`link ${oldp}`);
      if (newKey === newp)
        throw new AlreadyExists(`link ${oldpath} -> ${newpath}`);

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
    options: DenoType.OpenOptions = { read: true }
  ): Promise<FsFile> {
    checkOpenOptions(options);
    const pathStr = fromFileUrl(path);
    const absPath = resolve(pathStr);

    const ino = await this.#db.get("tree", absPath);
    if (!ino) throw new NotFound(`open ${pathStr}`);

    const info = await this.#db.get("table", ino);
    if (!info) {
      void this.#db.delete("tree", absPath);
      throw new NotFound(`open ${pathStr}`);
    }

    const node = new IDBFile(info);
    const rid = self.Deno._resTable_.add(node);
    return new FsFile(rid);
  }

  async create(path: string | URL) {
    return await this.open(path, {
      read: true,
      write: true,
      truncate: true,
      create: true,
    });
  }
}
