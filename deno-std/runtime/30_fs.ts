import { Deno, FileResource } from "..";

export function fstatSync(rid: number) {
  const res = Deno._resTable_.get(rid);
  if (!(res instanceof FileResource)) {
    throw new Error("Cannot stat this type of resource");
  }
  return res.info;
}

export async function fstat(rid: number) {
  return Promise.resolve(fstatSync(rid));
}
