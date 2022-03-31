import {
  AlreadyExists,
  FsFile,
  NotFound,
  RESC_TABLE,
  SeekMode,
  checkOpenOptions,
  coerceLen,
  notImplemented,
  pathFromURL,
} from "@griffon/deno-std";
import type {
  DenoNamespace,
  FilePerms,
  FileResource,
  FileSystem,
  StorageDevice,
} from "@griffon/deno-std";

type FSHandle = FileSystemDirectoryHandle | FileSystemFileHandle;

class FileAccessFile implements FileResource {
  #offset = 0;

  readonly #handle: FSHandle;

  readonly #perms: FilePerms;

  constructor(handle: FSHandle, perms: FilePerms) {
    this.#handle = handle;
    this.#perms = perms;
  }

  get name() {
    return "fsFile" as const;
  }

  close() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.#handle = undefined;
  }

  async read(buffer: Uint8Array) {
    if (!this.#perms.read || this.#handle.kind !== "file")
      throw new Error("Bad file descriptor (os error 9)");

    const file = await this.#handle.getFile();
    const data = new Uint8Array(await file.slice(this.#offset).arrayBuffer());
    if (data.byteLength === 0) return 0;

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

  async write(buffer: Uint8Array) {
    if (
      (!this.#perms.write && !this.#perms.append) ||
      this.#handle.kind !== "file"
    )
      throw new Error("Bad file descriptor (os error 9)");

    let writable: FileSystemWritableFileStream;
    if (this.#perms.write) {
      if (this.#offset === 0) {
        writable = await this.#handle.createWritable({
          keepExistingData: false,
        });
      } else {
        writable = await this.#handle.createWritable();
        await writable.truncate(this.#offset);
      }
    } /* append */ else {
      writable = await this.#handle.createWritable();
    }

    await writable.write(buffer);
    await writable.close();

    this.#offset = buffer.length;
    return buffer.length;
  }

  async truncate(len: number) {
    if (!this.#perms.write || this.#handle.kind !== "file")
      throw new Error("Bad file descriptor (os error 9)");

    const writable = await this.#handle.createWritable();
    await writable.truncate(len);
  }

  seekSync(offset: number, whence: SeekMode) {
    if (this.#handle.kind !== "file")
      throw new Error("Bad file descriptor (os error 9)");

    let ret: number;

    if (whence === SeekMode.Start) ret = offset;
    else if (whence === SeekMode.Current) ret = this.#offset + offset;
    else if (whence === SeekMode.End) notImplemented();
    else throw new TypeError(`Invalid seek mode: ${whence as number}`);

    if (ret < 0) throw new TypeError("Invalid argument (os error 22)");

    this.#offset = ret;
    return ret;
  }

  async seek(offset: number, whence: SeekMode) {
    if (this.#handle.kind !== "file")
      throw new Error("Bad file descriptor (os error 9)");

    let ret: number;

    if (whence === SeekMode.Start) ret = offset;
    else if (whence === SeekMode.Current) ret = this.#offset + offset;
    else if (whence === SeekMode.End)
      ret = (await this.#handle.getFile()).size + offset;
    else throw new TypeError(`Invalid seek mode: ${whence as number}`);

    if (ret < 0) throw new TypeError("Invalid argument (os error 22)");

    this.#offset = ret;
    return ret;
  }

  statSync() {
    if (this.#handle.kind === "file") {
      notImplemented();
    }
    return {
      isFile: false,
      isDirectory: true,
      isSymlink: false,
      size: 0,
      mtime: null,
      birthtime: null,
      nlink: null,
      ino: null,
    };
  }

  async stat() {
    let size = 0;
    let mtime: Date | null = null;
    const isFile = this.#handle.kind === "file";
    if (this.#handle.kind === "file") {
      const file = await this.#handle.getFile();
      size = file.size;
      mtime = new Date(file.lastModified);
    }

    return {
      isSymlink: false,
      birthtime: null,
      nlink: null,
      ino: null,

      isFile,
      isDirectory: !isFile,
      size,
      mtime,
    };
  }
}

class FileAccessStorageDevice implements StorageDevice {
  readonly #name = "fa" as const;

  get name() {
    return this.#name;
  }

  /**
   * Available only in window scope.
   */
  async newDevice(root: FileSystemDirectoryHandle) {
    if ((await root.queryPermission({ mode: "readwrite" })) !== "granted") {
      if ((await root.requestPermission({ mode: "readwrite" })) === "denied") {
        throw new Error("Permission denied");
      }
    }
    return new FileAccessFileSystem(root);
  }
}

export type { FileAccessStorageDevice };

export const fileAccessStorageDevice = new FileAccessStorageDevice();

export class FileAccessFileSystem implements FileSystem {
  readonly #root!: FileSystemDirectoryHandle;

  constructor(root: FileSystemDirectoryHandle) {
    this.#root = root;
  }

  close() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.#root = undefined;

    return Promise.resolve();
  }

  async open(
    path: string | URL,
    options: DenoNamespace.OpenOptions = { read: true }
  ): Promise<DenoNamespace.FsFile> {
    checkOpenOptions(options);
    const pathStr = pathFromURL(path);
    // const absPath = resolve(pathStr);
    const absPath = pathStr;
    const res = await this.#getHandle(absPath, "open");
    const { dir, name } = res;
    let { base } = res;

    if (!base) {
      if ((!options.create && !options.createNew) || !name)
        throw NotFound.from(`open '${pathStr}'`);

      base = await dir.getFileHandle(name, { create: true });
    } else if (base.kind === "file") {
      if (options.createNew) throw AlreadyExists.from(`open '${pathStr}'`);

      if (options.truncate) {
        const writable = await base.createWritable({ keepExistingData: false });
        await writable.close();
      }
    } else {
      if (options.append || options.write || options.truncate)
        throw new Error(`Is a directory (os error 21), open '${pathStr}'`);
    }

    const node = new FileAccessFile(base, options);
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

  async mkdir(path: string | URL, options?: DenoNamespace.MkdirOptions) {
    const pathStr = pathFromURL(path);
    // const absPath = resolve(pathStr);
    const absPath = pathStr;

    const parts = absPath.split("/");
    const name = parts.pop();
    if (!name) return;

    let dir = this.#root;
    const opt = { create: !!options?.recursive };
    try {
      for (const part of parts)
        if (part) dir = await dir.getDirectoryHandle(part, opt);
    } catch {
      throw NotFound.from(`mkdir '${pathStr}'`);
    }

    await dir.getDirectoryHandle(name, { create: true });
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

  async remove(path: string | URL, options?: DenoNamespace.RemoveOptions) {
    const pathStr = pathFromURL(path);
    // const absPath = resolve(pathStr);
    const absPath = pathStr;

    const { dir, base } = await this.#getHandleOrThrow(absPath, "remove");

    if (base.kind === "file") await dir.removeEntry(base.name);
    else {
      try {
        await dir.removeEntry(base.name, { recursive: !!options?.recursive });
      } catch {
        throw new Error(
          `Directory not empty (os error 39), remove '${pathStr}'`
        );
      }
    }
  }

  async rename(oldpath: string | URL, newpath: string | URL) {
    const oldpathStr = pathFromURL(oldpath);
    // const absOldPath = resolve(oldpathStr);
    const absOldPath = oldpathStr;
    const newpathStr = pathFromURL(newpath);
    // const absNewPath = resolve(newpathStr);
    const absNewPath = newpathStr;

    /**
     * Same as {@link copyFile}
     */
    const { dir: oldDir, base: oldBase } = await this.#getHandleOrThrow(
      absOldPath,
      "copy"
    );
    if (!oldBase)
      throw NotFound.from(`copy '${oldpathStr}' -> '${newpathStr}'`);

    if (oldBase.kind === "directory")
      throw new Error(
        `Is a directory (os error 21), copy '${oldpathStr}' to '${newpathStr}'`
      );

    const {
      dir: newDir,
      base: oldNewBase,
      name,
    } = await this.#getHandle(absNewPath, "copy");
    if (!name || oldNewBase?.kind === "directory")
      throw new Error(
        `Is a directory (os error 21), copy '${oldpathStr}' to '${newpathStr}'`
      );
    if (oldNewBase?.kind === "file") await newDir.removeEntry(name);

    const toBase = await newDir.getFileHandle(name, { create: true });
    const fromFile = await oldBase.getFile();
    const readable = fromFile.stream();
    const writable = await toBase.createWritable();
    await readable.pipeTo(writable);

    /**
     * Different from {@link copyFile}, remove the old file.
     */
    await oldDir.removeEntry(oldBase.name);

    // Maybe supported in the future.
    // await oldBase.move(absNewPath);
  }

  readDir(path: string | URL): AsyncIterable<DenoNamespace.DirEntry> {
    const pathStr = pathFromURL(path);
    // const absPath = resolve(pathStr);
    const absPath = pathStr;

    const getHandle = this.#getHandleOrThrow(absPath, "readDir");
    return {
      async *[Symbol.asyncIterator]() {
        const { base } = await getHandle;

        if (base.kind === "file")
          throw new Error(
            `Not a directory (os error 20), readDir '${pathStr}'`
          );

        for await (const { name, kind } of base.values()) {
          const isDirectory = kind === "directory";
          yield { name, isDirectory, isFile: !isDirectory, isSymlink: false };
        }
      },
    };
  }

  async copyFile(fromPath: string | URL, toPath: string | URL) {
    const fromPathStr = pathFromURL(fromPath);
    // const absFromPath = resolve(fromPathStr);
    const absFromPath = fromPathStr;
    const toPathStr = pathFromURL(toPath);
    // const absToPath = resolve(toPathStr);
    const absToPath = toPathStr;

    const { base } = await this.#getHandleOrThrow(absFromPath, "copy");
    if (!base) throw NotFound.from(`copy '${fromPathStr}' -> '${toPathStr}'`);

    if (base.kind === "directory")
      throw new Error(
        `Is a directory (os error 21), copy '${fromPathStr}' to '${toPathStr}'`
      );

    const {
      dir,
      base: oldToBase,
      name,
    } = await this.#getHandle(absToPath, "copy");
    if (!name || oldToBase?.kind === "directory")
      throw new Error(
        `Is a directory (os error 21), copy '${fromPathStr}' to '${toPathStr}'`
      );
    if (oldToBase?.kind === "file") await dir.removeEntry(name);

    const toBase = await dir.getFileHandle(name, { create: true });
    const fromFile = await base.getFile();
    const readable = fromFile.stream();
    const writable = await toBase.createWritable();
    await readable.pipeTo(writable);
  }

  async lstat(path: string | URL): Promise<DenoNamespace.FileInfo> {
    const pathStr = pathFromURL(path);
    // const absPath = resolve(pathStr);
    const absPath = pathStr;

    const { base } = await this.#getHandleOrThrow(absPath, "lstat");

    let size = 0;
    let mtime: Date | null = null;
    const isFile = base.kind === "file";
    if (base.kind === "file") {
      const file = await base.getFile();
      size = file.size;
      mtime = new Date(file.lastModified);
    }

    return {
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
      isSymlink: false,

      isFile,
      isDirectory: !isFile,
      size,
      mtime,
    };
  }

  async stat(path: string | URL): Promise<DenoNamespace.FileInfo> {
    const pathStr = pathFromURL(path);
    // const absPath = resolve(pathStr);
    const absPath = pathStr;

    const { base } = await this.#getHandleOrThrow(absPath, "stat");

    let size = 0;
    let mtime: Date | null = null;
    const isFile = base.kind === "file";
    if (base.kind === "file") {
      const file = await base.getFile();
      size = file.size;
      mtime = new Date(file.lastModified);
    }

    return {
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
      isSymlink: false,

      isFile,
      isDirectory: !isFile,
      size,
      mtime,
    };
  }

  async truncate(name: string, len?: number) {
    len = coerceLen(len);
    // const absPath = resolve(name);
    const absPath = name;

    const { base } = await this.#getHandleOrThrow(absPath, "truncate");
    if (base.kind === "directory") {
      throw new TypeError(`Is a directory (os error 21), truncate '${name}'`);
    }

    const writable = await base.createWritable();
    await writable.truncate(len);
    await writable.close();
  }

  async #getHandle(path: string, func: string) {
    const parts = path.split("/");
    const name = parts.pop();

    let dir = this.#root;
    try {
      for (const part of parts)
        if (part) dir = await dir.getDirectoryHandle(part);
    } catch {
      throw NotFound.from(`${func} '${path}'`);
    }

    let base: FSHandle | undefined;
    if (name) {
      base = await dir.getFileHandle(name).catch(() => undefined);
      if (!base)
        base = await dir.getDirectoryHandle(name).catch(() => undefined);
    }
    return { dir, base, name };
  }

  async #getHandleOrThrow(path: string, func: string) {
    let dir = this.#root;
    if (path === "/") return { dir, base: this.#root };

    const parts = path.split("/");
    const name = parts.pop();
    if (!name) throw NotFound.from(`${func} '${path}'`);

    try {
      for (const part of parts)
        if (part) dir = await dir.getDirectoryHandle(part);
    } catch {
      throw NotFound.from(`${func} '${path}'`);
    }

    let base: FSHandle | undefined;
    base = await dir.getFileHandle(name).catch(() => undefined);
    if (!base) base = await dir.getDirectoryHandle(name).catch(() => undefined);
    if (!base) throw NotFound.from(`${func} '${path}'`);
    return { dir, base, name };
  }
}
