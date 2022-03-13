import type { ChanWrap, Dict } from ".";

export const enum WkrSvcTp {
  /** Placeholder. */
  none,
  /** The process is going to exit. */
  exit,
}

export const enum WkrSvcChanTp {
  /** Placeholder. */
  none,
  /** Spawn a new process, ask for a new PID. */
  proc,
}

type Msg<T extends WkrSvcTp, D = Dict> = { _t: T } & D;

export type Svc2Wkr = Msg<WkrSvcTp.none>;

export type Wkr2Svc = Msg<WkrSvcTp.exit, { pid: number }>;

type ChanMsg<T extends WkrSvcChanTp, D = Dict> = { _t: T } & D;

export type Wkr2SvcChan = ChanMsg<WkrSvcChanTp.proc, { ppid: number }>;

export interface Wkr2SvcMap {
  [WkrSvcChanTp.proc]: ChanWrap<{ pid: number }>;
}
