import { Errno } from "../error";
import type { IPosixSyscall } from "../syscall";

interface ITask {
    worker: Worker;

    pid: number;
}

export class Task implements ITask, IPosixSyscall {
    static maxPid = 0;

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
                const optLen = (this.cwd.length << 1) + 5;
                const buf8 = this.getcwd(new Uint8Array(optLen), optLen);
                if (buf8) {
                    this.uint8.subarray(4).set(buf8); // skip the fisrt i32
                    this.int32[0] = buf8.length;
                }
                Atomics.notify(this.int32, 0);
            }
        };
        this.worker.postMessage({ type: "sab", sab: this.sab });
    }

    static nextPid() {
        // 2^32 - 1
        if (++this.maxPid > 4294967295) throw Error("Too many tasks");
        return this.maxPid;
    }

    getcwd(buf: Uint8Array, size: number): Uint8Array | void {
        if (size === 0) throw Error(Errno.EINVAL.toString());
        const { read, written } = new TextEncoder().encodeInto(this.cwd, buf);
        if (!read) return;
        if (read < this.cwd.length) throw Error(Errno.ERANGE.toString());
        if (!written) return;
        return buf.subarray(0, written);
    }
}
