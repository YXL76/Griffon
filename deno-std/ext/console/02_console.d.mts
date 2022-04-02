// eslint-disable-next-line @typescript-eslint/naming-convention
export const Console: {
  new (
    printfn: (msg: string, level: number) => void
  ): typeof globalThis.console;
};
