import type {
  ChMshPool,
  Svc2Win,
  Win2SvcChan,
  Win2SvcMap,
} from "@griffon/shared";

let chan = 0;

export const svcMsgPool: ChMshPool = new Map();

export function chanMsg2Svc<D extends Win2SvcChan["data"]>(
  data: D,
  transfer?: Transferable[]
): Promise<Win2SvcMap[D["t"]]["data"]> {
  return new Promise((resolve, reject) => {
    svcMsgPool.set(++chan, { resolve, reject });
    const message = { data, chan };
    if (!transfer) self.svcTwoWay.postMessage(message);
    else self.svcTwoWay.postMessage(message, transfer);
  });
}

// export const wrkMsgPool: ChMshPool = new Map();

export function svcMsgHandler({ data }: MessageEvent<Svc2Win>) {
  switch (data.t) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from service: ${data}`);
  }
}
