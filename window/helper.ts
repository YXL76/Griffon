import type { Svc2Win, Win2Svc, Win2Wkr } from "@griffon/shared";
import { WinSvcTp, WinWkrTp } from "@griffon/shared";

export function msg2Service(message: Win2Svc, transfer?: Transferable[]) {
  if (transfer) mySW.postMessage(message, transfer);
  else mySW.postMessage(message);
}

export function msg2Worker(worker: Worker, msg: Win2Wkr) {
  worker.postMessage(msg);
}

export function svcMsgHandler(data: Exclude<Svc2Win, { type: WinSvcTp.user }>) {
  switch (data.type) {
    case WinSvcTp.process:
      {
        const worker = new Worker("worker.js", { type: "module" });

        const procMsg: Win2Wkr = {
          type: WinWkrTp.process,
          pid: data.pid,
          ppid: process.pid,
          cwd: process.cwd(),
          uid: process.getuid(),
        };
        msg2Worker(worker, procMsg);

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
        msg2Worker(worker, codeMsg);
      }
      break;
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      console.error(`Unknown message type from service: ${data}`);
  }
}
