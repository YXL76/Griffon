import { AlreadyExists, NotFound, pathFromURL } from "@griffon/deno-std";
import type {
  DenoNamespace,
  FileSystem,
  StorageDevice,
} from "@griffon/deno-std";
import { fileAccessStorageDevice, indexedDBStorageDevice } from ".";
import { resolve } from "@griffon/deno-std/deno_std/path/posix";

export class DeviceFileSystem implements FileSystem {
  readonly #storageDevs: Record<string, { dev: StorageDevice }> = {
    [fileAccessStorageDevice.name]: { dev: fileAccessStorageDevice },
    [indexedDBStorageDevice.name]: { dev: indexedDBStorageDevice },
  };

  readonly #tree = new Map<string, FileSystem>();

  async delete() {
    for (const dev of this.#tree.values()) await dev.delete();
    this.#tree.clear();
  }

  get(path: string) {
    return this.#tree.get(path);
  }

  async newStorageDev<D extends StorageDevice>(
    name: D["name"],
    id: number,
    ...args: Parameters<D["newDevice"]>
  ) {
    const dev = this.#storageDevs[name];
    if (!dev) throw NotFound.from(name);

    const path = `/${name}${id}`;
    if (this.#tree.has(path)) throw AlreadyExists.from(path);

    const newDev = await dev.dev.newDevice(...args);
    this.#tree.set(path, newDev);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chmodSync(_path: string | URL, _mode: number) {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async chmod(_path: string | URL, _mode: number) {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chownSync(_path: string | URL, _uid: number | null, _gid: number | null) {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async chown(_path: string | URL, _uid: number | null, _gid: number | null) {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeSync(path: string | URL, _options?: DenoNamespace.RemoveOptions) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const dev = this.#tree.get(absPath);
    if (!dev) throw NotFound.from(`remove '${pathStr}'`);

    const del = dev.delete();
    if (del instanceof Promise) console.warn("removeSync: it is a Promise");

    this.#tree.delete(absPath);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async remove(path: string | URL, _options?: DenoNamespace.RemoveOptions) {
    const pathStr = pathFromURL(path);
    const absPath = resolve(pathStr);

    const dev = this.#tree.get(absPath);
    if (!dev) throw NotFound.from(`remove '${pathStr}'`);

    await dev.delete();
    this.#tree.delete(absPath);
  }

  readDirSync(path: string | URL) {
    const absPath = resolve(pathFromURL(path));

    const tree = this.#tree;
    return {
      *[Symbol.iterator]() {
        const prefixLen = absPath === "/" ? 1 : absPath.length + 1;

        for (const path of tree.keys()) {
          if (!path.startsWith(absPath)) continue;
          const name = path.slice(prefixLen);
          if (!name || name.includes("/")) continue;
          yield { name, isFile: false, isDirectory: false, isSymlink: false };
        }
      },
    };
  }

  readDir(path: string | URL) {
    const absPath = resolve(pathFromURL(path));

    const tree = this.#tree;
    return {
      // eslint-disable-next-line @typescript-eslint/require-await
      async *[Symbol.asyncIterator]() {
        const prefixLen = absPath === "/" ? 1 : absPath.length + 1;

        for (const path of tree.keys()) {
          if (!path.startsWith(absPath)) continue;
          const name = path.slice(prefixLen);
          if (!name || name.includes("/")) continue;
          yield { name, isFile: false, isDirectory: false, isSymlink: false };
        }
      },
    };
  }

  lstatSync(path: string | URL): DenoNamespace.FileInfo {
    const absPath = resolve(pathFromURL(path));

    let isDirectory = false;
    if (absPath === "/") isDirectory = true;
    else if (!this.#tree.has(absPath))
      throw NotFound.from(`lstat '${absPath}'`);

    return {
      mtime: null,
      atime: null,
      dev: null,
      mode: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,
      birthtime: null,
      nlink: null,
      ino: null,
      isFile: false,
      isSymlink: false,
      size: 0,

      isDirectory,
    };
  }

  lstat(path: string | URL) {
    return Promise.resolve(this.lstatSync(path));
  }

  statSync(path: string | URL) {
    return this.lstatSync(path);
  }

  stat(path: string | URL) {
    return Promise.resolve(this.statSync(path));
  }
}
