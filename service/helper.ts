import type {
  Win2Svc,
  Win2SvcChan,
  Win2SvcMap,
  Wkr2Svc,
} from "@griffon/shared";
import { WinSvcChanTp } from "@griffon/shared";

let maxUid = 0;
let maxPid = 0;

export function winMsgHandler(source: Client, data: Win2Svc) {
  switch (data.t) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}

function winChanMsgDataHandler<D extends Win2SvcChan>(
  data: D
): Win2SvcMap[D["t"]]["data"] {
  switch (data.t) {
    case WinSvcChanTp.user:
      return { uid: ++maxUid, pid: ++maxPid };
    case WinSvcChanTp.proc:
      return { pid: ++maxPid };
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}

export function winChanMsgHandler(port: MessagePort, data: Win2SvcChan) {
  port.postMessage(winChanMsgDataHandler(data));
}

export function wkrMsgHandler(source: Client, data: Wkr2Svc) {
  switch (data.t) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}
