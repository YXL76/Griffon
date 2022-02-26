export const enum WinWkrTp {
  process,
  code,
}

// eslint-disable-next-line @typescript-eslint/ban-types
type Msg<T extends WinWkrTp, D = {}> = { type: T } & D;

export type Win2Wkr =
  | Msg<
      WinWkrTp.process,
      { pid: number; ppid: number; cwd: string; uid: number }
    >
  | Msg<WinWkrTp.code, { code: string }>;

export type Wkr2Win = Msg<WinWkrTp.process>;
