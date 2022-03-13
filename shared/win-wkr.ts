import type { Dict } from ".";

export const enum WinWkrTp {
  /** Placeholder. */
  none,
}

type Msg<T extends WinWkrTp, D = Dict> = { _t: T } & D;

export type Win2Wkr = Msg<WinWkrTp.none>;

export type Wkr2Win = Msg<WinWkrTp.none>;
