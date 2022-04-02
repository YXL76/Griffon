// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import { RESC_TABLE, notImplemented } from "..";
import type { DenoNamespace } from "..";

export enum SeekMode {
  /* eslint-disable @typescript-eslint/naming-convention */
  Start = 0,
  Current = 1,
  End = 2 /* eslint-enable @typescript-eslint/naming-convention */,
}

export async function write(rid: number, p: Uint8Array) {
  const resc = RESC_TABLE.getOrThrow(rid);
  if (!(typeof resc.write === "function")) notImplemented();

  return resc.write(p);
}

export function writeSync(rid: number, p: Uint8Array) {
  const resc = RESC_TABLE.getOrThrow(rid);
  if (!(typeof resc.writeSync === "function")) notImplemented();

  return resc.writeSync(p);
}

export async function read(rid: number, p: Uint8Array) {
  if (p.length === 0) return 0;

  const resc = RESC_TABLE.getOrThrow(rid);
  if (!(typeof resc.read === "function")) notImplemented();

  const nread = await resc.read(p);
  return nread === 0 ? null : nread;
}

export function readSync(rid: number, p: Uint8Array) {
  if (p.length === 0) return 0;

  const resc = RESC_TABLE.getOrThrow(rid);
  if (!(typeof resc.readSync === "function")) notImplemented();

  const nread = resc.readSync(p);
  return nread === 0 ? null : nread;
}

const READ_PER_ITER = 16 * 1024; // 16kb, see https://github.com/denoland/deno/issues/10157

export function readAll(r: DenoNamespace.FsFile) {
  return readAllInner(r);
}

export async function readAllInner(
  r: DenoNamespace.FsFile,
  options?: DenoNamespace.ReadFileOptions
) {
  const buffers: Uint8Array[] = [];
  const signal = options?.signal ?? null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    signal?.throwIfAborted?.();
    const buf = new Uint8Array(READ_PER_ITER);
    const read = await r.read(buf);
    if (typeof read == "number") {
      buffers.push(new Uint8Array(buf.buffer, 0, read));
    } else {
      break;
    }
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  signal?.throwIfAborted?.();

  return concatBuffers(buffers);
}

export function readAllSync(r: { readSync(p: Uint8Array): number | null }) {
  const buffers: Uint8Array[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const buf = new Uint8Array(READ_PER_ITER);
    const read = r.readSync(buf);
    if (typeof read == "number") {
      buffers.push(buf.subarray(0, read));
    } else {
      break;
    }
  }

  return concatBuffers(buffers);
}

export function concatBuffers(buffers: Uint8Array[]) {
  let totalLen = 0;
  for (const buf of buffers) {
    totalLen += buf.byteLength;
  }

  const contents = new Uint8Array(totalLen);

  let n = 0;
  for (const buf of buffers) {
    contents.set(buf, n);
    n += buf.byteLength;
  }

  return contents;
}

export function readAllSyncSized(
  r: { readSync(p: Uint8Array): number | null },
  size: number
) {
  const buf = new Uint8Array(size + 1); // 1B to detect extended files
  let cursor = 0;

  while (cursor < size) {
    const sliceEnd = Math.min(size + 1, cursor + READ_PER_ITER);
    const slice = buf.subarray(cursor, sliceEnd);
    const read = r.readSync(slice);
    if (typeof read == "number") {
      cursor += read;
    } else {
      break;
    }
  }

  // Handle truncated or extended files during read
  if (cursor > size) {
    // Read remaining and concat
    return concatBuffers([buf, readAllSync(r)]);
  } else {
    // cursor == size
    return buf.subarray(0, cursor);
  }
}

export async function readAllInnerSized(
  r: DenoNamespace.FsFile,
  size: number,
  options?: DenoNamespace.ReadFileOptions
) {
  const buf = new Uint8Array(size + 1); // 1B to detect extended files
  let cursor = 0;
  const signal = options?.signal ?? null;
  while (cursor < size) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    signal?.throwIfAborted?.();
    const sliceEnd = Math.min(size + 1, cursor + READ_PER_ITER);
    const slice = buf.subarray(cursor, sliceEnd);
    const read = await r.read(slice);
    if (typeof read == "number") {
      cursor += read;
    } else {
      break;
    }
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  signal?.throwIfAborted?.();

  // Handle truncated or extended files during read
  if (cursor > size) {
    // Read remaining and concat
    return concatBuffers([buf, await readAllInner(r, options)]);
  } else {
    return buf.subarray(0, cursor);
  }
}
