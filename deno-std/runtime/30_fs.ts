import { RESC_TABLE, notImplemented } from "..";

export function fstatSync(rid: number) {
  const res = RESC_TABLE.getOrThrow(rid);
  if (typeof res.fstatSync !== "function") notImplemented();

  return {
    atime: null,
    dev: null,
    mode: null,
    uid: null,
    gid: null,
    rdev: null,
    blksize: null,
    blocks: null,
    ...res.fstatSync(),
  };
}

export async function fstat(rid: number) {
  const res = RESC_TABLE.getOrThrow(rid);
  if (typeof res.fstat !== "function") notImplemented();

  return {
    atime: null,
    dev: null,
    mode: null,
    uid: null,
    gid: null,
    rdev: null,
    blksize: null,
    blocks: null,
    ...(await res.fstat()),
  };
}
