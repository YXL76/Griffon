import type { Dict } from ".";

export const enum SvcWkrTp {
  /** Placeholder */
  none,
}

type Msg<T extends SvcWkrTp, D = Dict> = { t: T } & D;

export type Svc2Wkr = Msg<SvcWkrTp.none>;

export type Wkr2Svc = Msg<SvcWkrTp.none>;
