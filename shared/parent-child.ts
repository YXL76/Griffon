import type { Dict } from ".";

export const enum ParentChildTp {
  /** Placeholder. */
  none,
  /** Basic process information. */
  proc,
  /** The code to run. */
  code,
  /** The process is going to exit. */
  exit,
}

type Msg<T extends ParentChildTp, D = Dict> = { _t: T } & D;

export type Parent2Child =
  | Msg<
      ParentChildTp.proc,
      {
        pid: number;
        ppid: number;
        cwd: string;
        uid: number;
        wid: number;
        sab: SharedArrayBuffer;
        winSab: SharedArrayBuffer;
      }
    >
  | Msg<ParentChildTp.code, { code: string }>;

export type Child2Parent = Msg<ParentChildTp.exit, { code: number }>;
