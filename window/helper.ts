import type { Svc2Win, Win2Svc } from "@griffon/shared";
import { ChildProcess } from "./process";
import { WinSvcTp } from "@griffon/shared";

export function msg2Service(message: Win2Svc, transfer?: Transferable[]) {
  if (transfer) self.mySW.postMessage(message, transfer);
  else self.mySW.postMessage(message);
}

export function svcMsgHandler(data: Exclude<Svc2Win, { type: WinSvcTp.user }>) {
  switch (data.type) {
    case WinSvcTp.process:
      new ChildProcess(data.pid);
      break;
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      console.error(`Unknown message type from service: ${data}`);
  }
}
