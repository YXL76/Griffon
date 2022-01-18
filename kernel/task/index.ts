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
                const buf = new Uint8Array(this.uint32.subarray(1));
                let { written } = new TextEncoder().encodeInto(this.cwd, buf);
                if (!written || written === 0) written = 1;
                this.uint32[0] = written;
                Atomics.notify(this.int32, 0);
            }
        };
        this.worker.postMessage({ type: "sab", sab: this.sab });
    }

    static maxPid = 0;

    static nextPid() {
        // 2^32 - 1
        if (++this.maxPid > 4294967295) throw new Error("Too many tasks");
        return this.maxPid;
    }
}
