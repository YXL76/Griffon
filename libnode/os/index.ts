import type * as os from "node:os";
import {
  _processArch,
  _processPlatform,
} from "@griffon/libnode-internal/helper";
import { EOL } from "@griffon/libnode-internal/constants";
import { dlopen } from "./dlopen";
import { errno } from "./errno";
import { priority } from "./priority";
import { signals } from "./signals";

export const constants = {
  errno,
  dlopen,
  priority,
  signals,
};

/** @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView#endianness Endianness} */
const isBigEndian = (() => {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, 256, true);
  return new Int16Array(buffer)[0] !== 256;
})();

const kEndianness = isBigEndian ? "BE" : "LE";

export const cpus: typeof os.cpus = () => {
  return <os.CpuInfo[]>new Array(navigator?.hardwareConcurrency || 1).fill({});
};

interface ChromePerformance extends Performance {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

export const freemem: typeof os.freemem = () => {
  const memory = (<ChromePerformance | void>performance)?.memory;
  return memory
    ? memory.jsHeapSizeLimit - memory.usedJSHeapSize
    : Number.MAX_VALUE;
};

export const totalmem: typeof os.totalmem = () =>
  (<ChromePerformance | void>performance)?.memory?.jsHeapSizeLimit ??
  Number.MAX_VALUE;

export const type: typeof os.type = () => "Browser";

export const release: typeof os.release = () => "";

export const arch: typeof os.arch = _processArch;

export const version: typeof os.version = () => "";

export const platform: typeof os.platform = _processPlatform;

export const homedir: typeof os.homedir = () => "/";

export const tmpdir: typeof os.tmpdir = () => "/tmp";

export const endianness: typeof os.endianness = () => kEndianness;

export const getPriority: typeof os.getPriority = () => 1;

export const setPriority: typeof os.setPriority = () => {
  // noop
};

export { EOL };
