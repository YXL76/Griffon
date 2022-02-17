/// <reference types="node/os" />

import type * as os from "node:os";

/** @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView#endianness Endianness} */
const isBigEndian = (() => {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, 256, true);
  return new Int16Array(buffer)[0] !== 256;
})();

const kEndianness = isBigEndian ? "BE" : "LE";

export const cpus: typeof os.cpus = () => {
  return new Array(navigator.hardwareConcurrency || 1).fill({}) as os.CpuInfo[];
};

export const arch: typeof os.arch = () => process.arch;

export const platform: typeof os.platform = () => process.platform;

export const tmpdir: typeof os.tmpdir = () => "/tmp";

export const endianness: typeof os.endianness = () => kEndianness;
