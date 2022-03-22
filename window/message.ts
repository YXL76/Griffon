import type {
  Win2Svc,
  Win2SvcChan,
  Win2SvcMap,
  Win2Win,
  Wkr2Win,
} from "@griffon/shared";
import { WinWinTp, WinWkrTp, pid2Wid } from "@griffon/shared";
import { dispatchSignalEvent } from "./signals";
import { procTree } from "./process";

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

export function wkrHandler(
  this: MessagePort,
  wid: number,
  { data, ports }: MessageEvent<Wkr2Win>
) {
  switch (data._t) {
    case WinWkrTp.proc:
      ports[0].onmessage = wkrHandler.bind(ports[0], data.wid);
      break;
    case WinWkrTp.pid:
      self.SAB32[wid] = procTree.nextPid(this);
      if (Atomics.notify(self.SAB32, wid) === 0)
        throw new Error("Atomics.notify failed");
      break;
    case WinWkrTp.kill:
      self.Deno.kill(data.pid, data.sig);
  }
}

export function winHandler({ data }: MessageEvent<Win2Win>) {
  switch (data._t) {
    case WinWinTp.kill:
      if (data.pid === self.Deno.pid) dispatchSignalEvent(data.sig);
      else if (data.sig === "SIGCONT")
        Atomics.notify(self.SAB32, pid2Wid(data.pid));
      else procTree.postMessage(data.pid, { _t: WinWkrTp.kill, sig: data.sig });
  }
}
