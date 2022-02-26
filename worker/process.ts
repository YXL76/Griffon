import { BaseProcess } from "@griffon/libnode-globals";

export class Process extends BaseProcess {
  constructor(uid: number, pid: number, ppid: number, private _cwd: string) {
    super(
      { fd: 0 } as BaseProcess["stdin"],
      { fd: 1 } as BaseProcess["stdout"],
      { fd: 2 } as BaseProcess["stderr"],
      pid,
      ppid,
      pid.toString(),
      uid
    );
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
    throw Error("Not implemented");
  }

  abort(): never {
    throw Error("Not implemented");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setuid(_id: number | string): void {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  kill(_pid: number, _signal?: string | number): true {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  umask(_mask?: string | number) {
    return 0;
  }

  disconnect() {
    // noop
  }
}
