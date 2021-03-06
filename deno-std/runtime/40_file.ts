// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import type { DenoNamespace, Resource } from "..";
import {
  RESC_TABLE,
  notImplemented,
  readableStreamForRid,
  writableStreamForRid,
} from "..";
import {
  fstat,
  fstatSync,
  ftruncate,
  ftruncateSync,
  read,
  readSync,
  write,
  writeSync,
} from ".";
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

  get readable() {
    if (this.#readable === undefined) {
      this.#readable = readableStreamForRid(this.rid);
    }
    return this.#readable;
  }

  get writable() {
    if (this.#writable === undefined) {
      this.#writable = writableStreamForRid(this.rid);
    }
    return this.#writable;
  }

  write(p: Uint8Array) {
    return write(this.#rid, p);
  }

  writeSync(p: Uint8Array) {
    return writeSync(this.#rid, p);
  }

  truncate(len?: number) {
    return ftruncate(this.#rid, len);
  }

  truncateSync(len?: number) {
    return ftruncateSync(this.#rid, len);
  }

  read(p: Uint8Array) {
    return read(this.#rid, p);
  }

  readSync(p: Uint8Array) {
    return readSync(this.#rid, p);
  }

  seek(offset: number, whence: SeekMode) {
    const resc = RESC_TABLE.getOrThrow(this.#rid);
    if (!(typeof resc.seek === "function")) notImplemented();

    return resc.seek(offset, whence);
  }

  seekSync(offset: number, whence: SeekMode) {
    const resc = RESC_TABLE.getOrThrow(this.#rid);
    if (!(typeof resc.seekSync === "function")) notImplemented();

    return resc.seekSync(offset, whence);
  }

  stat() {
    return fstat(this.#rid);
  }

  statSync() {
    return fstatSync(this.#rid);
  }

  close() {
    RESC_TABLE.close(this.#rid);
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

  get readable() {
    if (this.#readable === undefined) {
      this.#readable = readableStreamForRid(this.rid);
    }
    return this.#readable;
  }

  read(p: Uint8Array) {
    return read(this.rid, p);
  }

  readSync(p: Uint8Array) {
    return readSync(this.rid, p);
  }

  close() {
    RESC_TABLE.close(this.rid);
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

  get writable() {
    if (this.#writable === undefined) {
      this.#writable = writableStreamForRid(this.rid);
    }
    return this.#writable;
  }

  write(p: Uint8Array) {
    return write(this.rid, p);
  }

  writeSync(p: Uint8Array) {
    return writeSync(this.rid, p);
  }

  close() {
    RESC_TABLE.close(this.rid);
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

  get writable() {
    if (this.#writable === undefined) {
      this.#writable = writableStreamForRid(this.rid);
    }
    return this.#writable;
  }

  write(p: Uint8Array) {
    return write(this.rid, p);
  }

  writeSync(p: Uint8Array) {
    return writeSync(this.rid, p);
  }

  close() {
    RESC_TABLE.close(this.rid);
  }
}

export const stdin = new Stdin();
export const stdout = new Stdout();
export const stderr = new Stderr();

export function checkOpenOptions(options: DenoNamespace.OpenOptions) {
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
