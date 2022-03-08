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

type Msg<T extends WinSvcTp, D = Dict> = { t: T } & D;

export type Win2Svc = Msg<WinSvcTp.none>;

export type Svc2Win = Msg<WinSvcTp.none>;

type ChanMsg<T extends WinSvcChanTp, D = Dict> = { t: T } & D;

/* type ChMsgReq<T extends WinSvcChanTp, D = Dict> = {
  chan: number;
  data: { t: T } & D;
}; */

type ChMsgRes<D = Dict> = { chan: number; data: D };

export type Win2SvcChan =
  | ChanMsg<WinSvcChanTp.user>
  | ChanMsg<WinSvcChanTp.proc, { uid: number }>;

export interface Win2SvcMap {
  // These should never be sent
  [WinSvcChanTp.none]: ChMsgRes;

  [WinSvcChanTp.user]: ChMsgRes<{ uid: number; pid: number }>;
  [WinSvcChanTp.proc]: ChMsgRes<{ pid: number }>;
}
