/// <reference types="node/url" />

import type * as url from "url";
import { CHAR_FORWARD_SLASH } from "./constants";
import path from "../path";

const ERR_INVALID_URL_SCHEME = Error;
const ERR_INVALID_FILE_URL_HOST = Error;
const ERR_INVALID_FILE_URL_PATH = Error;

export const domainToASCII: typeof url.domainToASCII = function (domain) {
  try {
    const url = new URL(`http://${domain}`);
    return url.hostname;
  } catch {
    return "";
  }
};

export const domainToUnicode: typeof url.domainToUnicode = function (domain) {
  try {
    return decodeURIComponent(domain);
  } catch {
    return domain;
  }
};

function getPathFromURLPosix(url: URL) {
  if (url.hostname !== "") {
    throw new ERR_INVALID_FILE_URL_HOST();
  }
  const pathname = url.pathname;
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === "%") {
      const third = pathname.codePointAt(n + 2) as number | 0x20;
      if (pathname[n + 1] === "2" && third === 102) {
        throw new ERR_INVALID_FILE_URL_PATH(
          "must not include encoded / characters"
        );
      }
    }
  }
  return decodeURIComponent(pathname);
}

export const fileURLToPath: typeof url.fileURLToPath = function (
  path: string | URL
) {
  if (typeof path === "string") path = new URL(path);
  if (path.protocol !== "file:") throw new ERR_INVALID_URL_SCHEME("file");
  return getPathFromURLPosix(path);
};

// The following characters are percent-encoded when converting from file path
// to URL:
// - %: The percent character is the only character not encoded by the
//        `pathname` setter.
// - \: Backslash is encoded on non-windows platforms since it's a valid
//      character but the `pathname` setters replaces it by a forward slash.
// - LF: The newline character is stripped out by the `pathname` setter.
//       (See whatwg/url#419)
// - CR: The carriage return character is also stripped out by the `pathname`
//       setter.
// - TAB: The tab character is also stripped out by the `pathname` setter.
const percentRegEx = /%/g;
const backslashRegEx = /\\/g;
const newlineRegEx = /\n/g;
const carriageReturnRegEx = /\r/g;
const tabRegEx = /\t/g;

function encodePathChars(filepath: string) {
  if (filepath.includes("%")) filepath = filepath.replace(percentRegEx, "%25");
  // In posix, backslash is a valid character in paths:
  if (filepath.includes("\\"))
    filepath = filepath.replace(backslashRegEx, "%5C");
  if (filepath.includes("\n")) filepath = filepath.replace(newlineRegEx, "%0A");
  if (filepath.includes("\r"))
    filepath = filepath.replace(carriageReturnRegEx, "%0D");
  if (filepath.includes("\t")) filepath = filepath.replace(tabRegEx, "%09");
  return filepath;
}

export const pathToFileURL = function (filepath): URL {
  const outURL = new URL("file://");

  let resolved = path.resolve(filepath);
  // path.resolve strips trailing slashes so we must add them back
  const filePathLast = filepath.charCodeAt(filepath.length - 1);
  if (
    filePathLast === CHAR_FORWARD_SLASH &&
    resolved[resolved.length - 1] !== path.sep
  )
    resolved += "/";
  outURL.pathname = encodePathChars(resolved);

  return outURL;
} as typeof url.pathToFileURL;
