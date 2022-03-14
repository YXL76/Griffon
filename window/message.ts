import type { Win2Svc, Win2SvcChan, Win2SvcMap } from "@griffon/shared";

export class Channel {
  static svc<D extends Win2SvcChan>(
    data: D,
    transfer?: Transferable[]
  ): Promise<Win2SvcMap[D["_t"]]["data"]> {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      channel.port1.onmessage = ({ data }) => resolve(data);
      channel.port1.onmessageerror = reject;
      if (!transfer) self.SW.postMessage(data, [channel.port2]);
      else self.SW.postMessage(data, [channel.port2, ...transfer]);
    });
  }
}

export function msg2Svc(msg: Win2Svc, transfer?: Transferable[]) {
  if (!transfer) self.SW.postMessage(msg);
  else self.SW.postMessage(msg, transfer);
}
