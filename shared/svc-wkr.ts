export const enum SvcWkrTp {
  tmp,
}

// eslint-disable-next-line @typescript-eslint/ban-types
type Msg<T extends SvcWkrTp, D = {}> = { type: T } & D;

export type Svc2Wkr = Msg<SvcWkrTp.tmp>;

export type Wkr2Svc = Msg<SvcWkrTp.tmp>;
