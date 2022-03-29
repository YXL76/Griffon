import type {
  DenoFsMethodsAsyncWithoutTmpnfile,
  DenoType,
} from "@griffon/deno-std";
import type { Dict, SignalNoCont } from "..";

export const enum ParentChildTp {
  /** Placeholder. */
  none,
  /** Basic process information. */
  proc,
  /** The code to run. */
  code,
  /** The process is going to exit. */
  exit,
  /** Like POSIX kill. */
  kill,
  /** Filesystem sync request. */
  fsSync,
}

type Msg<T extends ParentChildTp, D = Dict> = { _t: T } & D;

type FSSyncMsgKey =
  | Exclude<DenoFsMethodsAsyncWithoutTmpnfile, "open" | "create">
  | "readFile"
  | "writeFile";

export type FSSyncMsg<K extends FSSyncMsgKey = FSSyncMsgKey> = Msg<
  ParentChildTp.fsSync,
  { fn: K; sab: SharedArrayBuffer; args: Parameters<DenoType[K]> }
>;

export type Parent2Child =
  | Msg<
      ParentChildTp.proc,
      {
        pid: number;
        ppid: number;
        cwd: string;
        uid: number;
        env: Record<string, string>;
        wid: number;
        sab: SharedArrayBuffer;
        winSab: SharedArrayBuffer;
      }
    >
  | Msg<ParentChildTp.code, { code: string }>
  | Msg<ParentChildTp.kill, { sig: SignalNoCont }>
  | FSSyncMsg;

export type Child2Parent =
  | Msg<ParentChildTp.exit, { code: number; sig?: number }>
  | FSSyncMsg;
