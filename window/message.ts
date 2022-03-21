import type {
  Win2Svc,
  Win2SvcChan,
  Win2SvcMap,
  Wkr2Win,
} from "@griffon/shared";
import { WinWkrTp } from "@griffon/shared";

export class Channel {
  static svc<D extends Win2SvcChan>(
    data: Omit<D, "chan">,
    transfer?: Transferable[]
  ): Promise<Win2SvcMap[D["_t"]]["data"]> {
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

export function msg2Svc(msg: Win2Svc, transfer?: Transferable[]) {
  if (!transfer) self.SW.postMessage(msg);
  else self.SW.postMessage(msg, transfer);
}

export function wkrHandler(id: number, { data, ports }: MessageEvent<Wkr2Win>) {
  switch (data._t) {
    case WinWkrTp.proc:
      ports[0].onmessage = wkrHandler.bind(undefined, data.wid);
      break;
    case WinWkrTp.pid:
      self.SAB32[id] = self.NEXT_PID;
      Atomics.notify(self.SAB32, id);
  }
}
