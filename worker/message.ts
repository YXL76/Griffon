import type {
  Child2Parent,
  Wkr2Svc,
  Wkr2SvcChan,
  Wkr2SvcMap,
} from "@griffon/shared";

export class Channel {
  static svc<D extends Wkr2SvcChan>(
    data: Omit<D, "chan">,
    transfer?: Transferable[]
  ): Promise<Wkr2SvcMap[D["_t"]]["data"]> {
    return new Promise((resolve, reject) => {
      (<D>data).chan = true;
      const channel = new MessageChannel();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      channel.port1.onmessage = ({ data }) => resolve(data);
      channel.port1.onmessageerror = reject;
      if (!transfer) self.SW.postMessage(data, [channel.port2]);
      else self.SW.postMessage(data, [channel.port2, ...transfer]);
    });
  }
}

export function msg2Parent(msg: Child2Parent, transfer?: Transferable[]) {
  if (!transfer) self.postMessage(msg);
  else self.postMessage(msg, transfer);
}

export function msg2Svc(msg: Wkr2Svc, transfer?: Transferable[]) {
  if (!transfer) self.SW.postMessage(msg);
  else self.SW.postMessage(msg, transfer);
}
