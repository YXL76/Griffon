import { BaseChildProcess, BaseProcess } from "@griffon/libnode-globals";
import type { Win2Wkr, Wkr2Win } from "@griffon/shared";
import { WinSvcChanTp, WinWkrTp } from "@griffon/shared";
import { FileSystem } from "./fs";
import { chanMsg2Svc } from "./helper";

export class Process extends BaseProcess {
  private _cwd: string;

  private readonly _children = new Map<number, ChildProcess>();

  constructor(pid: number, uid: number) {
    super(
      { fd: 0 } as BaseProcess["stdin"],
      { fd: 1 } as BaseProcess["stdout"],
      { fd: 2 } as BaseProcess["stderr"],
      pid,
      0,
      pid.toString(),
      uid
    );
    this._cwd = `/home/${pid}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chdir(_directory: string) {
    // noop
  }

  cwd(): string {
    return this._cwd;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  exit(_code?: number): never {
    return self.close() as never;
  }

  abort(): never {
    return self.close() as never;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setuid(_id: number | string): void {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  kill(_pid: number, _signal?: string | number) {
    return true as const;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  umask(_mask?: string | number) {
    return 0;
  }

  disconnect() {
    // noop
  }

  async _newChildProcess() {
    const { pid } = await chanMsg2Svc({
      _t: WinSvcChanTp.proc,
      uid: this._uid,
    });
    const child = new ChildProcess(pid);
    this._children.set(pid, child);
    return child;
  }

  _removeChildProcess(pid: number) {
    this._children.delete(pid);
  }
}

export class ChildProcess extends BaseChildProcess {
  private _worker?: Worker;

  private readonly _sab = new SharedArrayBuffer(8);

  private readonly _children = new Map<number, ChildProcess>();

  constructor(
    public override readonly pid: number,
    private readonly _parent: ChildProcess | Process = process
  ) {
    super();

    this._worker = new Worker("worker.js", { type: "module" });

    this._worker.addEventListener(
      "message",
      ({ data }: MessageEvent<Wkr2Win>) => {
        switch (data._t) {
          case WinWkrTp.term:
            this.kill();
            break;
        }
      }
    );

    this.postMessage({
      _t: WinWkrTp.proc,
      pid,
      ppid: _parent.pid,
      cwd: process.cwd(),
      uid: process.getuid(),
      sab: this._sab,
    });
  }

  exec(path: string) {
    FileSystem.readFile(path, {}, (err, data) => {
      if (!err) {
        this.postMessage({ _t: WinWkrTp.code, code: data.toString() });
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  kill(_signal?: number) {
    if (this.killed) return true;
    this._worker?.terminate();
    this._worker = undefined;
    this.killed = true;
    this._parent._removeChildProcess(this.pid);
    return true;
  }

  postMessage(msg: Win2Wkr) {
    this._worker?.postMessage(msg);
  }

  disconnect() {
    // noop
  }

  unref() {
    // noop
  }

  ref() {
    // noop
  }

  _removeChildProcess(pid: number) {
    this._children.delete(pid);
  }
}
