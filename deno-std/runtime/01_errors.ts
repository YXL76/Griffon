// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import { errorMap } from "../deno_std/node/internal_binding/uv";
import { os } from "../deno_std/node/internal_binding/constants";

const { errno } = os;

const fallback = [undefined, "Unknown"] as const;

export class NotFound extends Error {
  override name = "NotFound";

  static from(msg = "", no: number = errno.ENOENT, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class PermissionDenied extends Error {
  override name = "PermissionDenied";

  static from(msg = "", no: number = errno.EACCES, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class ConnectionRefused extends Error {
  override name = "ConnectionRefused";

  static from(
    msg = "",
    no: number = errno.ECONNREFUSED,
    options?: ErrorOptions
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class ConnectionReset extends Error {
  override name = "ConnectionReset";

  static from(msg = "", no: number = errno.ECONNRESET, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class ConnectionAborted extends Error {
  override name = "ConnectionAborted";

  static from(
    msg = "",
    no: number = errno.ECONNABORTED,
    options?: ErrorOptions
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class NotConnected extends Error {
  override name = "NotConnected";

  static from(msg = "", no: number = errno.ENOTCONN, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class AddrInUse extends Error {
  override name = "AddrInUse";

  static from(msg = "", no: number = errno.EADDRINUSE, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class AddrNotAvailable extends Error {
  override name = "AddrNotAvailable";

  static from(
    msg = "",
    no: number = errno.EADDRNOTAVAIL,
    options?: ErrorOptions
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class BrokenPipe extends Error {
  override name = "BrokenPipe";

  static from(msg = "", no: number = errno.EPIPE, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class AlreadyExists extends Error {
  override name = "AlreadyExists";

  static from(msg = "", no: number = errno.EEXIST, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class InvalidData extends Error {
  override name = "InvalidData";
}

export class TimedOut extends Error {
  override name = "TimedOut";

  static from(msg = "", no: number = errno.ETIMEDOUT, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class Interrupted extends Error {
  override name = "Interrupted";

  static from(msg = "", no: number = errno.EINTR, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
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

  static from(msg = "", no: number = errno.EBUSY, options?: ErrorOptions) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, desc] = errorMap.get(-no) ?? fallback;
    return new this(`${desc} (os error ${no}), ${msg}`, options);
  }
}

export class NotSupported extends Error {
  override name = "NotSupported";
}
