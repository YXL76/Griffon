import type { Dict } from ".";

export const enum WinSvcTp {
  /** Placeholder */
  none,
}

export const enum WinSvcChanTp {
  /** Placeholder */
  none,
  user,
  proc,
}

type Msg<T extends WinSvcTp, D = Dict> = { _t: T } & D;

export type Win2Svc = Msg<WinSvcTp.none>;

export type Svc2Win = Msg<WinSvcTp.none>;

type ChanMsg<T extends WinSvcChanTp, D = Dict> = { _t: T } & D;

export type Win2SvcChan =
  | ChanMsg<WinSvcChanTp.user>
  | ChanMsg<WinSvcChanTp.proc, { uid: number }>;

// I don't know why, but the compiler like this:
type Wrap<T> = { data: T };

export interface Win2SvcMap {
  [WinSvcChanTp.user]: Wrap<{ uid: number; pid: number }>;
  [WinSvcChanTp.proc]: Wrap<{ pid: number }>;
}
