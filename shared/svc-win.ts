import type { ChanWrap, Dict } from ".";

/**
 * One-way communication from Window to Service Worker.
 */
export const enum WinSvcTp {
  /** Placeholder. */
  none,
  /** A Window is closing. */
  exit,
  /** Spawn a new process, ask for a new PID. */
  proc,
  /** A MessagePort connected to the Service Worker. */
  port,
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
}

type Msg<T extends WinSvcTp, D = Dict> = { _t: T } & D;

export type Win2Svc =
  | Msg<WinSvcTp.exit, { pid: number }>
  | Msg<WinSvcTp.proc, { ppid: number; sab: Int32Array }>
  | Msg<WinSvcTp.port>;

type ChanMsg<T extends WinSvcChanTp, D = Dict> = { _t: T } & D;

export type Win2SvcChan = ChanMsg<WinSvcChanTp.user>;

export interface Win2SvcMap {
  [WinSvcChanTp.user]: ChanWrap<{
    uid: number;
    pid: number;
    sab: SharedArrayBuffer;
  }>;
}
