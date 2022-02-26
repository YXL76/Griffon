import type { Svc2Win, Win2Svc, Wkr2Svc } from "@griffon/shared";
import { WinSvcTp } from "@griffon/shared";

let maxUid = 0;
let maxPid = 0;

export function winMsgHandler(data: Win2Svc, source: Client) {
  switch (data.type) {
    case WinSvcTp.user: {
      const msg: Svc2Win = {
        type: WinSvcTp.user,
        uid: ++maxUid,
        pid: ++maxPid,
      };
      source.postMessage(msg);
      break;
    }
    case WinSvcTp.process: {
      const msg: Svc2Win = { type: WinSvcTp.process, pid: ++maxPid };
      source.postMessage(msg);
      break;
    }
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      console.error(`Unknown message type from window: ${data}`);
  }
}

export function wkrMsgHandler(data: Wkr2Svc, source: Client) {
  switch (data.type) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      console.error(`Unknown message type from window: ${data}`);
  }
}
