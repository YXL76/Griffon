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
}

type Msg<T extends WkrSvcTp, D = Dict> = { _t: T } & D;

export type Svc2Wkr = Msg<WkrSvcTp.none>;

export type Wkr2Svc = Msg<WkrSvcTp.proc> | Msg<WkrSvcTp.exit, { pid: number }>;

type ChanMsg<T extends WkrSvcChanTp, D = Dict> = { _t: T; chan: true } & D;

export type Wkr2SvcChan = ChanMsg<WkrSvcChanTp.none>;

export interface Wkr2SvcMap {
  [WkrSvcChanTp.none]: ChanWrap<Dict>;
}
