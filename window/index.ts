import {
  chanMsg2Svc,
  svcMsgPool as svcChanPool,
  svcMsgHandler,
} from "./helper";
import { Process } from "./process";
import type { Win2SvcMap } from "@griffon/shared";
import { WinSvcChanTp } from "@griffon/shared";

export async function boot() {
  return new Promise<Process>((resolve, reject) => {
    navigator.serviceWorker
      .register("./service.js", { type: "module" })
      .then((reg) => {
        self.mySWR = reg;
        self.mySW = reg.installing ?? reg.waiting ?? <ServiceWorker>reg.active;
        if (self.mySW.state === "activated") return;

        return new Promise<void>((resolve) => {
          const listener = () => {
            if (self.mySW.state === "activated")
              resolve(self.mySW.removeEventListener("statechange", listener));
          };
          self.mySW.addEventListener("statechange", listener);
        });
      })
      .then(() => {
        if (self.mySW !== navigator.serviceWorker.controller)
          throw Error("Service worker not activated");
        console.log("Service worker activated");

        const upChan = new MessageChannel();
        const updownChan = new MessageChannel();
        self.svcOneWay = upChan.port1;
        self.svcTwoWay = updownChan.port1;
        self.mySW.postMessage("", [upChan.port2, updownChan.port2]);

        self.svcOneWay.onmessage = svcMsgHandler.bind(undefined);
        self.svcTwoWay.onmessage = <K extends WinSvcChanTp>({
          data: { chan, data },
        }: MessageEvent<Win2SvcMap[K]>) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const { resolve } = svcChanPool.get(chan)!;
          resolve(data);
          svcChanPool.delete(chan);
        };

        return chanMsg2Svc({ t: WinSvcChanTp.user });
      })
      .then(({ uid, pid }) => resolve((self.process = new Process(pid, uid))))
      .catch(reject);
  });
}

await boot();
await process._newChildProcess();
