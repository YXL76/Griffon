export const enum WinSvcTp {
  /** Placeholder */
  none,
  user,
  proc,
}

type Msg<T extends WinSvcTp, D = Record<never, never>> = { type: T } & D;

export type Win2Svc = Msg<WinSvcTp.none>;

export type Svc2Win = Msg<WinSvcTp.none>;

type ChMsgReq<T extends WinSvcTp, D = Record<never, never>> = {
  chan: number;
  data: Msg<T, D>;
};

type ChMsgRes<D = Record<never, never>> = {
  chan: number;
  data: D;
};

export type Win2SvcChan =
  | ChMsgReq<WinSvcTp.user>
  | ChMsgReq<WinSvcTp.proc, { uid: number }>;

export interface Win2SvcMap {
  // These should never be sent
  [WinSvcTp.none]: ChMsgRes;

  [WinSvcTp.user]: ChMsgRes<{ uid: number; pid: number }>;
  [WinSvcTp.proc]: ChMsgRes<{ pid: number }>;
}
