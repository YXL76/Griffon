import { chanMsg2Svc, svcMsgHandler } from "./helper";
import { Process } from "./process";
import { WinSvcChanTp } from "@griffon/shared";

export async function boot() {
  return new Promise<Process>((resolve, reject) => {
    const swc = navigator.serviceWorker;
    swc
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
        if (self.mySW !== swc.controller)
          throw Error("Service worker not activated");
        console.log("Service worker activated");

        swc.addEventListener("message", svcMsgHandler.bind(undefined));
        return chanMsg2Svc({ _t: WinSvcChanTp.user });
      })
      .then(({ uid, pid }) => resolve((self.process = new Process(pid, uid))))
      .catch(reject);
  });
}

await boot();
const ch1 = await process._newChildProcess();
ch1.exec("/root/path.js");
const ch2 = await process._newChildProcess();
ch2.exec("/root/src/url.js");
