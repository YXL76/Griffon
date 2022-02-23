import { Errno } from "../error";
import type { IPosixSyscall } from "../syscall";

/* interface ITask {
  _worker: Worker;
  pid: number;
  cwd: string;
} */

export class Task implements IPosixSyscall {
  static maxPid = 0;

  parent?: Task;

  pid: number;

  cwd: string;

  private readonly _sab: SharedArrayBuffer;

  private readonly _uint8: Uint8Array;

  private readonly _int32: Int32Array;

  private readonly _uint32: Uint32Array;

  private readonly _worker: Worker;

  constructor() {
    this._worker = new Worker("task.js", { type: "module" });
    this.pid = Task.nextPid();
    this.cwd = "root";
    this._sab = new SharedArrayBuffer(1024);
    this._uint8 = new Uint8Array(this._sab);
    this._int32 = new Int32Array(this._sab);
    this._uint32 = new Uint32Array(this._sab);
    this._worker.onmessage = ({ data }) => {
      if (data.type === "syscall") {
        /** @see {@link https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encodeInto#buffer_sizing Buffer Sizing} */
        const optLen = (this.cwd.length << 1) + 5;
        const buf8 = this.getcwd(new Uint8Array(optLen), optLen);
        if (buf8) {
          this._uint8.subarray(4).set(buf8); // skip the fisrt i32
          this._int32[0] = buf8.length;
        }
        Atomics.notify(this._int32, 0);
      }
    };
    this._worker.postMessage({ type: "sab", sab: this._sab });
  }

  static nextPid() {
    // 2 ^ 32 - 1
    if (++this.maxPid > 0xffffffff) throw Error("Too many tasks");
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

  getpid(): number {
    return this.pid;
  }

  getppid(): number {
    return this.parent?.pid ?? 0;
  }
}
