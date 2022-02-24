/// <reference types="node/url" />

import type * as url from "node:url";
import {
  CHAR_FORWARD_SLASH,
  CHAR_LOWERCASE_A,
  CHAR_LOWERCASE_Z,
} from "@griffon/libnode-internal/constants";
import { isWindows } from "@griffon/libnode-internal/helper";
import path from "@griffon/libnode-path";
import { toUnicode } from "@griffon/libnode-punycode";

const globalURL = URL;
const globalURLSearchParams = URLSearchParams;

export { globalURL as URL, globalURLSearchParams as URLSearchParams };

const ERR_INVALID_URL_SCHEME = Error;
const ERR_INVALID_FILE_URL_HOST = Error;
const ERR_INVALID_FILE_URL_PATH = Error;

export const format = ((
  urlObject: URL,
  options?: url.URLFormatOptions
): string => {
  if (!options) return urlObject.toString();
  const tmp = new URL(urlObject);
  if (options.auth === false) tmp.username = tmp.password = "";
  if (options.fragment === false) tmp.hash = "";
  if (options.search === false) tmp.search = "";
  const ret = tmp.toString();
  return options.unicode ? toUnicode(ret) : ret;
}) as typeof url.format;

export const domainToASCII: typeof url.domainToASCII = function (domain) {
  try {
    const url = new URL(
      domain.startsWith("http") ? domain : `https://${domain}`
    );
    return url.hostname;
  } catch {
    return "";
  }
};

export const domainToUnicode: typeof url.domainToUnicode = toUnicode;

const forwardSlashRegEx = /\//g;

function getPathFromURLWin32(url: URL) {
  const hostname = url.hostname;
  let pathname = url.pathname;
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === "%") {
      const third = pathname.codePointAt(n + 2) as number | 0x20;
      if (
        (pathname[n + 1] === "2" && third === 102) || // 2f 2F /
        (pathname[n + 1] === "5" && third === 99)
      ) {
        // 5c 5C \
        throw new ERR_INVALID_FILE_URL_PATH(
          "must not include encoded \\ or / characters"
        );
      }
    }
  }
  pathname = pathname.replace(forwardSlashRegEx, "\\");
  pathname = decodeURIComponent(pathname);
  if (hostname !== "") {
    // If hostname is set, then we have a UNC path
    // Pass the hostname through domainToUnicode just in case
    // it is an IDN using punycode encoding. We do not need to worry
    // about percent encoding because the URL parser will have
    // already taken care of that for us. Note that this only
    // causes IDNs with an appropriate `xn--` prefix to be decoded.
    return `\\\\${domainToUnicode(hostname)}${pathname}`;
  }
  // Otherwise, it's a local path that requires a drive letter
  const letter = pathname.codePointAt(1) as number | 0x20;
  const sep = pathname[2];
  if (
    letter < CHAR_LOWERCASE_A ||
    letter > CHAR_LOWERCASE_Z || // a..z A..Z
    sep !== ":"
  ) {
    throw new ERR_INVALID_FILE_URL_PATH("must be absolute");
  }
  return pathname.slice(1);
}

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
  return isWindows() ? getPathFromURLWin32(path) : getPathFromURLPosix(path);
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

export const pathToFileURL: typeof url.pathToFileURL = (filepath): URL => {
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
};
