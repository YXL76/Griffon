// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import { errorMap } from "../deno_std/node/internal_binding/uv";
import { os } from "../deno_std/node/internal_binding/constants";

const { errno } = os;

const fallback = [undefined, "Unknown"] as const;

export class NotFound extends Error {
  override name = "NotFound";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.ENOENT) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class PermissionDenied extends Error {
  override name = "PermissionDenied";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.EACCES) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class ConnectionRefused extends Error {
  override name = "ConnectionRefused";

  constructor(
    msg = "",
    options?: ErrorOptions,
    no: number = errno.ECONNREFUSED
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class ConnectionReset extends Error {
  override name = "ConnectionReset";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.ECONNRESET) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class ConnectionAborted extends Error {
  override name = "ConnectionAborted";

  constructor(
    msg = "",
    options?: ErrorOptions,
    no: number = errno.ECONNABORTED
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class NotConnected extends Error {
  override name = "NotConnected";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.ENOTCONN) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class AddrInUse extends Error {
  override name = "AddrInUse";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.EADDRINUSE) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class AddrNotAvailable extends Error {
  override name = "AddrNotAvailable";

  constructor(
    msg = "",
    options?: ErrorOptions,
    no: number = errno.EADDRNOTAVAIL
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class BrokenPipe extends Error {
  override name = "BrokenPipe";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.EPIPE) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class AlreadyExists extends Error {
  override name = "AlreadyExists";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.EEXIST) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class InvalidData extends Error {
  override name = "InvalidData";
}

export class TimedOut extends Error {
  override name = "TimedOut";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.ETIMEDOUT) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class Interrupted extends Error {
  override name = "Interrupted";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.EINTR) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class WriteZero extends Error {
  override name = "WriteZero";
}

export class UnexpectedEof extends Error {
  override name = "UnexpectedEof";
}

export class BadResource extends Error {
  override name = "BadResource";
}

export class Http extends Error {
  override name = "Http";
}

export class Busy extends Error {
  override name = "Busy";

  constructor(msg = "", options?: ErrorOptions, no: number = errno.EBUSY) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    super(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class NotSupported extends Error {
  override name = "NotSupported";
}
