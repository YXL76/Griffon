export * from "./svc-win";
export * from "./win-wkr";
export * from "./svc-wkr";

export type Dict = Record<never, never>;

export type ChMshPool = Map<
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ number,
  { resolve: (value?: any) => void; reject: (reason?: string) => void }
>;
