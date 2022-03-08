export const enum SvcWkrTp {
  /** Placeholder */
  none,
}

// eslint-disable-next-line @typescript-eslint/ban-types
type Msg<T extends SvcWkrTp, D = {}> = { type: T } & D;

export type Svc2Wkr = Msg<SvcWkrTp.none>;

export type Wkr2Svc = Msg<SvcWkrTp.none>;
