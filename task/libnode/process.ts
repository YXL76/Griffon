/// <reference types="node/globals" />
/// <reference types="node/process" />

export class Process implements NodeJS.Process {
  readonly arch = "x64";

  readonly platform = "linux" as NodeJS.Platform;

  readonly mainModule?: NodeJS.Module;

  readonly memoryUsage = _memoryUsage;

  cwd() {
    self.postMessage({ type: "syscall" });
    const uint8 = new Uint8Array(self.sab);
    const int32 = new Int32Array(self.sab);
    if (Atomics.wait(int32, 0, 0) === "ok") {
      const len = Atomics.exchange(int32, 0, 0);
      const buf8 = new Uint8Array(uint8.subarray(4, len + 4)); // skip the fisrt i32
      return new TextDecoder().decode(buf8.buffer);
    } else throw Error("wait failed");
  }
}

function _memoryUsage() {
  interface ChromePerformance extends Performance {
    memory: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  }

  const { memory } = performance as ChromePerformance;
  if (memory) {
    const { totalJSHeapSize, usedJSHeapSize } = memory;
    return {
      rss: totalJSHeapSize - usedJSHeapSize,
      heapTotal: totalJSHeapSize,
      heapUsed: usedJSHeapSize,
      external: 0,
      arrayBuffers: 0,
    };
  }
  return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 };
}

_memoryUsage.rss = () => _memoryUsage().rss;
