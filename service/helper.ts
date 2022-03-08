import type {
  Win2Svc,
  Win2SvcChan,
  Win2SvcMap,
  Wkr2Svc,
} from "@griffon/shared";
import { WinSvcTp } from "@griffon/shared";

let maxUid = 0;
let maxPid = 0;

export function winMsgHandler(data: Win2Svc, source: Client) {
  switch (data.type) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}

function _winChanMsgDataHandler<D extends Win2SvcChan["data"]>(
  data: D
): Win2SvcMap[D["type"]]["data"] {
  switch (data.type) {
    case WinSvcTp.user:
      return { uid: ++maxUid, pid: ++maxPid };
    case WinSvcTp.proc:
      return { pid: ++maxPid };
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}

export function winChanMsgHandler(data: Win2SvcChan, source: Client) {
  const ret = _winChanMsgDataHandler(data.data);
  source.postMessage({ chan: data.chan, data: ret });
}

export function wkrMsgHandler(data: Wkr2Svc, source: Client) {
  switch (data.type) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}
