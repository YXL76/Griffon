// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import { RESC_TABLE, notImplemented } from "..";

export function fstatSync(rid: number) {
  const res = RESC_TABLE.getOrThrow(rid);
  if (typeof res.statSync !== "function") notImplemented();

  return {
    atime: null,
    dev: null,
    mode: null,
    uid: null,
    gid: null,
    rdev: null,
    blksize: null,
    blocks: null,
    ...res.statSync(),
  };
}

export async function fstat(rid: number) {
  const res = RESC_TABLE.getOrThrow(rid);
  if (typeof res.stat !== "function") notImplemented();

  return {
    atime: null,
    dev: null,
    mode: null,
    uid: null,
    gid: null,
    rdev: null,
    blksize: null,
    blocks: null,
    ...(await res.stat()),
  };
}

export function coerceLen(len?: number | null) {
  if (len == null || len < 0) {
    return 0;
  }

  return len;
}

export function ftruncateSync(rid: number, len?: number) {
  const res = RESC_TABLE.getOrThrow(rid);
  if (typeof res.truncateSync !== "function") notImplemented();
  return res.truncateSync(coerceLen(len));
}

export function ftruncate(rid: number, len?: number) {
  const res = RESC_TABLE.getOrThrow(rid);
  if (typeof res.truncate !== "function") notImplemented();
  return res.truncate(coerceLen(len));
}
