// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import { fromFileUrl } from "../deno_std/path/posix";

export function pathFromURL(pathOrUrl: string | URL) {
  if (pathOrUrl instanceof URL) return fromFileUrl(pathOrUrl);
  return pathOrUrl;
}
