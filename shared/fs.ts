export interface IFileSystem {
  readFile(
    path: string,
    options: { encoding?: null | undefined; flag?: string | undefined }
  ): Promise<string>;
}

export type FSRet<K extends keyof IFileSystem> = Awaited<
  ReturnType<IFileSystem[K]>
>;

export type FSRetWithError<K extends keyof IFileSystem> =
  | { data: FSRet<K> }
  | { err: string };

export type FSMsg<K extends keyof IFileSystem> = {
  _fn: K;
  args: Parameters<IFileSystem[K]>;
};
