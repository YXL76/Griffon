import { RESC_TABLE, notImplemented } from "..";

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
