interface ITask {
    worker: Worker;

    pid: number;
}

export class Task implements ITask {
    worker: Worker;

    pid: number;

    cwd: string;

    sab: SharedArrayBuffer;

    uint8: Uint8Array;

    int32: Int32Array;

    uint32: Uint32Array;

    constructor() {
        this.worker = new Worker("task.js", { type: "module" });
        this.pid = Task.nextPid();
        this.cwd = "root";
        this.sab = new SharedArrayBuffer(1024);
        this.uint8 = new Uint8Array(this.sab);
        this.int32 = new Int32Array(this.sab);
        this.uint32 = new Uint32Array(this.sab);
        this.worker.onmessage = ({ data }) => {
            if (data.type === "syscall") {
                /** @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encodeInto#buffer_sizing Buffer Sizing} */
                const buf8 = new Uint8Array((this.cwd.length << 1) + 5);
                let { written } = new TextEncoder().encodeInto(this.cwd, buf8);
                if (!written) written = 0;
                this.uint8.subarray(4).set(buf8.subarray(0, written)); // skip the fisrt i32
                this.int32[0] = written;
                Atomics.notify(this.int32, 0);
            }
        };
        this.worker.postMessage({ type: "sab", sab: this.sab });
    }

    static maxPid = 0;

    static nextPid() {
        // 2^32 - 1
        if (++this.maxPid > 4294967295) throw Error("Too many tasks");
        return this.maxPid;
    }
}
