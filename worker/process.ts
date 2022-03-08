import { BaseProcess } from "@griffon/libnode-globals";
import { WinWkrTp } from "@griffon/shared";
import { msg2Window } from "./helper";

export class Process extends BaseProcess {
  private readonly _int32: Int32Array;

  constructor(
    uid: number,
    pid: number,
    ppid: number,
    private _cwd: string,
    private readonly _sab: SharedArrayBuffer
  ) {
    super(
      { fd: 0 } as BaseProcess["stdin"],
      { fd: 1 } as BaseProcess["stdout"],
      { fd: 2 } as BaseProcess["stderr"],
      pid,
      ppid,
      pid.toString(),
      uid
    );
    this._int32 = new Int32Array(this._sab);
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
    msg2Window({ type: WinWkrTp.term });
    return Atomics.wait(this._int32, 0, 0) as never;
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
}
