/// <reference types="node/url" />

import type * as url from "url";

export {
  domainToASCII,
  domainToUnicode,
  fileURLToPath,
  pathToFileURL,
} from "./internal/url";

// Format a parsed object into a url string
export function format(urlObject: URL, options?: url.URLFormatOptions): string {
  if (!options) return urlObject.toString();
  const url = new URL(urlObject);
  if (options.auth) url.username = url.password = "";
  if (options.fragment) url.hash = "";
  if (options.search) url.search = "";
  return url.toString();
}
