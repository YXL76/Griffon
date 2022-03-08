import type {
  Win2Svc,
  Win2SvcChan,
  Win2SvcMap,
  Wkr2Svc,
} from "@griffon/shared";
import { WinSvcChanTp } from "@griffon/shared";

let maxUid = 0;
let maxPid = 0;

export function winMsgHandler(
  port: MessagePort,
  { data }: MessageEvent<Win2Svc>
) {
  switch (data.t) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}

function winChanMsgDataHandler<D extends Win2SvcChan["data"]>(
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

export function winChanMsgHandler(
  port: MessagePort,
  { data: { data, chan } }: MessageEvent<Win2SvcChan>
) {
  port.postMessage({ chan, data: winChanMsgDataHandler(data) });
}

export function wkrMsgHandler(data: Wkr2Svc, source: Client) {
  switch (data.t) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}
