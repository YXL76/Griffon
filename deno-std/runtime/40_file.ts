import type { DenoType, Resource } from "..";
import { fstat, fstatSync } from ".";
import type { SeekMode } from ".";

export class FsFile {
  #rid = 0;

  #readable?: ReadableStream<Uint8Array>;

  #writable?: WritableStream<Uint8Array>;

  constructor(rid: number) {
    this.#rid = rid;
  }

  get rid() {
    return this.#rid;
  }

  get readable(): ReadableStream<Uint8Array> {
    throw new Error("Not implemented.");
    /* if (this.#readable === undefined) {
      this.#readable = readableStreamForRid(this.rid);
    }
    return this.#readable; */
  }

  get writable(): WritableStream<Uint8Array> {
    throw new Error("Not implemented.");
    /* if (this.#writable === undefined) {
      this.#writable = writableStreamForRid(this.rid);
    }
    return this.#writable; */
  }

  write(p: Uint8Array): Promise<number> {
    throw new Error("Not implemented.");
    // return write(this.rid, p);
  }

  writeSync(p: Uint8Array): number {
    throw new Error("Not implemented.");
    // return writeSync(this.rid, p);
  }

  truncate(len?: number): Promise<void> {
    throw new Error("Not implemented.");
    // return ftruncate(this.rid, len);
  }

  truncateSync(len?: number) {
    throw new Error("Not implemented.");
    // return ftruncateSync(this.rid, len);
  }

  read(p: Uint8Array): Promise<number | null> {
    throw new Error("Not implemented.");
    // return read(this.rid, p);
  }

  readSync(p: Uint8Array): number | null {
    throw new Error("Not implemented.");
    // return readSync(this.rid, p);
  }

  seek(offset: number, whence: SeekMode): Promise<number> {
    throw new Error("Not implemented.");
    // return seek(this.rid, offset, whence);
  }

  seekSync(offset: number, whence: SeekMode): number {
    throw new Error("Not implemented.");
    // return seekSync(this.rid, offset, whence);
  }

  async stat(): Promise<DenoType.FileInfo> {
    return {
      atime: null,
      dev: null,
      mode: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,
      ...(await fstat(this.rid)),
    };
  }

  statSync(): DenoType.FileInfo {
    return {
      atime: null,
      dev: null,
      mode: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,
      ...fstatSync(this.rid),
    };
  }

  close() {
    throw new Error("Not implemented.");
    // core.close(this.rid);
  }
}

class Stdin implements Resource {
  #readable?: ReadableStream<Uint8Array>;

  get rid() {
    return 0;
  }

  get name() {
    return "stdin";
  }

  get readable(): ReadableStream<Uint8Array> {
    throw new Error("Not implemented.");
    /* if (this.#readable === undefined) {
      this.#readable = readableStreamForRid(this.rid);
    }
    return this.#readable; */
  }

  read(p: Uint8Array): Promise<number | null> {
    throw new Error("Not implemented.");
    // return read(this.rid, p);
  }

  readSync(p: Uint8Array): number | null {
    throw new Error("Not implemented.");
    // return readSync(this.rid, p);
  }

  close() {
    throw new Error("Not implemented.");
    // core.close(this.rid);
  }
}

class Stdout implements Resource {
  #writable?: WritableStream<Uint8Array>;

  get rid() {
    return 1;
  }

  get name() {
    return "stdout";
  }

  get writable(): WritableStream<Uint8Array> {
    throw new Error("Not implemented.");
    /* if (this.#writable === undefined) {
      this.#writable = writableStreamForRid(this.rid);
    }
    return this.#writable; */
  }

  write(p: Uint8Array): Promise<number> {
    throw new Error("Not implemented.");
    // return write(this.rid, p);
  }

  writeSync(p: Uint8Array): number {
    throw new Error("Not implemented.");
    // return writeSync(this.rid, p);
  }

  close() {
    throw new Error("Not implemented.");
    // core.close(this.rid);
  }
}

class Stderr implements Resource {
  #writable?: WritableStream<Uint8Array>;

  get rid() {
    return 2;
  }

  get name() {
    return "stderr";
  }

  get writable(): WritableStream<Uint8Array> {
    throw new Error("Not implemented.");
    /* if (this.#writable === undefined) {
      this.#writable = writableStreamForRid(this.rid);
    }
    return this.#writable; */
  }

  write(p: Uint8Array): Promise<number> {
    throw new Error("Not implemented.");
    // return write(this.rid, p);
  }

  writeSync(p: Uint8Array): number {
    throw new Error("Not implemented.");
    // return writeSync(this.rid, p);
  }

  close() {
    throw new Error("Not implemented.");
    // core.close(this.rid);
  }
}

export const stdin = new Stdin();
export const stdout = new Stdout();
export const stderr = new Stderr();

export function checkOpenOptions(options: DenoType.OpenOptions) {
  if (!Object.values(options).includes(true)) {
    throw new Error("OpenOptions requires at least one option to be true");
  }

  if (options.truncate && !options.write) {
    throw new Error("'truncate' option requires 'write' option");
  }

  const createOrCreateNewWithoutWriteOrAppend =
    (options.create || options.createNew) && !(options.write || options.append);

  if (createOrCreateNewWithoutWriteOrAppend) {
    throw new Error(
      "'create' or 'createNew' options require 'write' or 'append' option"
    );
  }
}
