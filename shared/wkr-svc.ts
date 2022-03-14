import type { ChanWrap, Dict } from ".";

export const enum WkrSvcTp {
  /** Placeholder. */
  none,
  /** Spawn a new process, send the MessagePort */
  proc,
  /** The process is going to exit. */
  exit,
}

export const enum WkrSvcChanTp {
  /** Placeholder. */
  none,
  /** Ask for the PID */
  pid,
}

type Msg<T extends WkrSvcTp, D = Dict> = { _t: T } & D;

export type Svc2Wkr = Msg<WkrSvcTp.none>;

export type Wkr2Svc = Msg<WkrSvcTp.proc> | Msg<WkrSvcTp.exit, { pid: number }>;

type ChanMsg<T extends WkrSvcChanTp, D = Dict> = { _t: T } & D;

export type Wkr2SvcChan = ChanMsg<WkrSvcChanTp.pid, { ppid: number }>;

export interface Wkr2SvcMap {
  [WkrSvcChanTp.pid]: ChanWrap<{ pid: number }>;
}
