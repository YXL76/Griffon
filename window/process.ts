import type { Win2Wkr, Wkr2Win } from "@griffon/shared";
import { BaseProcess } from "@griffon/libnode-globals";
import { WinWkrTp } from "@griffon/shared";

export class Process extends BaseProcess {
  private _cwd: string;

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
    return close() as never;
  }

  abort(): never {
    return close() as never;
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

export class ChildProcess {
  private readonly _worker: Worker;

  private readonly _sab = new SharedArrayBuffer(8);

  constructor(public readonly pid: number) {
    this._worker = new Worker("worker.js", { type: "module" });

    this._worker.addEventListener(
      "message",
      ({ data }: MessageEvent<Wkr2Win>) => {
        switch (data.type) {
          case WinWkrTp.terminate:
            this._worker.terminate();
            break;
        }
      }
    );

    const procMsg: Win2Wkr = {
      type: WinWkrTp.process,
      pid,
      ppid: process.pid,
      cwd: process.cwd(),
      uid: process.getuid(),
      sab: this._sab,
    };
    this.postMessage(procMsg);

    const codeMsg: Win2Wkr = {
      type: WinWkrTp.code,
      code: `'use strict';
    const { basename, win32, dirname, extname, isAbsolute, join } = require("path");
          
    console.log(basename("/foo/bar/baz/asdf/quux.html"));
    console.log(win32.basename("C:\\\\foo.html", ".html"));
    console.log(dirname("/foo/bar/baz/asdf/quux"));
    console.log(extname("index.html"));
    console.log(isAbsolute("/foo/bar"));
    console.log(join("/foo", "bar", "baz/asdf", "quux", ".."));
          
    console.log(process.cwd());`,
    };
    this.postMessage(codeMsg);
  }

  postMessage(msg: Win2Wkr) {
    this._worker.postMessage(msg);
  }
}
