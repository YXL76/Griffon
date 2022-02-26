export const enum WinSvcTp {
  user,
  process,
}

// eslint-disable-next-line @typescript-eslint/ban-types
type Msg<T extends WinSvcTp, D = {}> = { type: T } & D;

export type Win2Svc =
  | Msg<WinSvcTp.user>
  | Msg<WinSvcTp.process, { uid: number }>;

export type Svc2Win =
  | Msg<WinSvcTp.user, { uid: number; pid: number }>
  | Msg<WinSvcTp.process, { pid: number }>;
