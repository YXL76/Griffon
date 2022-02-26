export const enum WinWkrTp {
  process,
  code,
  terminate,
}

// eslint-disable-next-line @typescript-eslint/ban-types
type Msg<T extends WinWkrTp, D = {}> = { type: T } & D;

export type Win2Wkr =
  | Msg<
      WinWkrTp.process,
      {
        pid: number;
        ppid: number;
        cwd: string;
        uid: number;
        sab: SharedArrayBuffer;
      }
    >
  | Msg<WinWkrTp.code, { code: string }>;

export type Wkr2Win = Msg<WinWkrTp.terminate>;
