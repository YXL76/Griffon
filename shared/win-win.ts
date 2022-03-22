import type { Dict, Signal } from ".";

export const enum WinWinTp {
  /** Placeholder. */
  none,
  /** Like POSIX kill. */
  kill,
}

type Msg<T extends WinWinTp, D = Dict> = { _t: T } & D;

export type Win2Win = Msg<WinWinTp.kill, { pid: number; sig: Signal }>;
