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
  /** The Node.js code to run. */
  node,
  /** The Deno code to run. */
  deno,
  /** The process is going to exit. */
  exit,
  /** Like POSIX kill. */
  kill,
  /** Filesystem sync request. */
  fsSync,

  stdin,
  stdout,
  stderr,
}

type Msg<T extends ParentChildTp, D = Dict> = { _t: T } & D;

export type FSSyncMsg<
  K extends DenoFsMethodsAsyncWithoutTmpnfile = DenoFsMethodsAsyncWithoutTmpnfile
> = Msg<
  ParentChildTp.fsSync,
  { fn: K; sab: SharedArrayBuffer; args: Parameters<DenoType[K]> }
>;

export interface FSSyncPostMessage {
  <K extends DenoFsMethodsAsyncWithoutTmpnfile>(
    message: FSSyncMsg<K>,
    transfer: Transferable[]
  ): void;
  <K extends DenoFsMethodsAsyncWithoutTmpnfile>(
    message: FSSyncMsg<K>,
    options?: StructuredSerializeOptions
  ): void;
}

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

        args: string[];
        stdout: "piped" | "null";
        stderr: "piped" | "null";
        stdin: "piped" | "null";
      }
    >
  | Msg<ParentChildTp.node, { code: string }>
  | Msg<ParentChildTp.deno, { code: string }>
  | Msg<ParentChildTp.kill, { sig: SignalNoCont }>
  | Msg<ParentChildTp.stdin>
  | Msg<ParentChildTp.stdout>
  | Msg<ParentChildTp.stderr>
  | FSSyncMsg;

export type Child2Parent =
  | Msg<ParentChildTp.exit, { code: number; sig?: number }>
  | FSSyncMsg;
