import type { ChanWrap, Dict } from ".";

/**
 * One-way communication from Window to Service Worker.
 */
export const enum WinSvcTp {
  /** Placeholder. */
  none,
  /** A Window is closing. */
  exit,
}

/**
 * Two-way Communication Channel between Window and Service Worker.
 * (Window -> Service Worker -> Window)
 */
export const enum WinSvcChanTp {
  /** Placeholder. */
  none,
  /** A new Window is created, ask for a new PID and UID. */
  user,
  /** Spawn a new process, ask for a new PID. */
  proc,
}

type Msg<T extends WinSvcTp, D = Dict> = { _t: T } & D;

export type Win2Svc = Msg<WinSvcTp.exit, { pid: number }>;

type ChanMsg<T extends WinSvcChanTp, D = Dict> = { _t: T } & D;

export type Win2SvcChan =
  | ChanMsg<WinSvcChanTp.user>
  | ChanMsg<WinSvcChanTp.proc, { ppid: number }>;

export interface Win2SvcMap {
  [WinSvcChanTp.user]: ChanWrap<{ uid: number; pid: number }>;
  [WinSvcChanTp.proc]: ChanWrap<{ pid: number }>;
}
