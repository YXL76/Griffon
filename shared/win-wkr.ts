import type { Dict, Signal, SignalNoCont } from ".";

export const enum WinWkrTp {
  /** Placeholder. */
  none,
  /** Spawn a new process, send the MessagePort */
  proc,
  /** Ask for PID. */
  pid,
  /** Like POSIX kill. */
  kill,
}

type Msg<T extends WinWkrTp, D = Dict> = { _t: T } & D;

export type Win2Wkr = Msg<WinWkrTp.kill, { sig: SignalNoCont }>;

export type Wkr2Win =
  | Msg<WinWkrTp.proc, { wid: number }>
  | Msg<WinWkrTp.pid>
  | Msg<WinWkrTp.kill, { pid: number; sig: Signal }>;
