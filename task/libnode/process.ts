/// <reference types="node/globals" />
/// <reference types="node/process" />

export class Process implements NodeJS.Process {
    readonly arch = "x64";

    readonly platform = "linux" as NodeJS.Platform;

    mainModule?: NodeJS.Module;

    memoryUsage = _memoryUsage;

    cwd() {
        self.postMessage({ type: "syscall" });
        const int32 = new Int32Array(self.sab);
        Atomics.wait(int32, 0, 0);
        const len = Atomics.exchange(int32, 0, 0);
        let uint8 = new Uint8Array(int32.subarray(1)).subarray(0, len);
        return new TextDecoder().decode(uint8);
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

    let { memory } = performance as ChromePerformance;
    if (memory) {
        let { totalJSHeapSize, usedJSHeapSize } = memory;
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
