import { fromFileUrl } from "../deno_std/path/posix";

export function pathFromURL(pathOrUrl: string | URL) {
  if (pathOrUrl instanceof URL) return fromFileUrl(pathOrUrl);
  return pathOrUrl;
}
