import type {
  FSMsg,
  FSRet,
  FSRetWithError,
  IFileSystem,
  Svc2Win,
  Win2SvcChan,
  Win2SvcMap,
} from "@griffon/shared";

export function chanMsg2Svc<D extends Win2SvcChan>(
  data: D,
  transfer?: Transferable[]
): Promise<Win2SvcMap[D["_t"]]["data"]> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    channel.port1.onmessage = ({ data }: MessageEvent) => resolve(data);
    if (!transfer) self.mySW.postMessage(data, [channel.port2]);
    else self.mySW.postMessage(data, [channel.port2, ...transfer]);
  });
}

export function fsMsg2Svc<K extends keyof IFileSystem>(
  data: FSMsg<K>,
  transfer?: Transferable[]
): Promise<FSRet<K>> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = ({ data }: MessageEvent<FSRetWithError<K>>) => {
      if ("data" in data) resolve(data.data);
      else reject(Error(data.err));
    };
    if (!transfer) self.mySW.postMessage(data, [channel.port2]);
    else self.mySW.postMessage(data, [channel.port2, ...transfer]);
  });
}

export function svcMsgHandler({ data }: MessageEvent<Svc2Win>) {
  switch (data._t) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from service: ${data}`);
  }
}
