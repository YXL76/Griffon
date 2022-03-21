import type { Dict } from ".";

export const enum WinWkrTp {
  /** Placeholder. */
  none,
  /** Spawn a new process, send the MessagePort */
  proc,
  /** Ask for PID. */
  pid,
}

type Msg<T extends WinWkrTp, D = Dict> = { _t: T } & D;

export type Win2Wkr = Msg<WinWkrTp.none>;

export type Wkr2Win = Msg<WinWkrTp.proc, { wid: number }> | Msg<WinWkrTp.pid>;
