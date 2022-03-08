import type {
  ChMshPool,
  Svc2Win,
  Win2Svc,
  Win2SvcChan,
  Win2SvcMap,
} from "@griffon/shared";

let chan = 0;

export const svcMsgPool: ChMshPool = new Map();

export function chanMsg2Svc<D extends Win2SvcChan["data"]>(
  data: D,
  transfer?: Transferable[]
): Promise<Win2SvcMap[D["type"]]["data"]> {
  return new Promise((resolve, reject) => {
    svcMsgPool.set(++chan, { resolve, reject });
    const message = { data, chan };
    if (!transfer) self.mySW.postMessage(message);
    else self.mySW.postMessage(message, transfer);
  });
}

// export const wrkMsgPool: ChMshPool = new Map();

export function msg2Svc(message: Win2Svc, transfer?: Transferable[]) {
  if (!transfer) self.mySW.postMessage(message);
  else self.mySW.postMessage(message, transfer);
}

export function svcMsgHandler(data: Svc2Win) {
  switch (data.type) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from service: ${data}`);
  }
}
