import { msg2Service, svcMsgHandler } from "./helper";
import { Process } from "./process";
import type { Svc2Win } from "@griffon/shared";
import { WinSvcTp } from "@griffon/shared";

export async function boot() {
  return new Promise<Process>((resolve, reject) => {
    navigator.serviceWorker
      .register("./service.js", { type: "module" })
      .then((reg) => {
        self.mySWR = reg;
        self.mySW = reg.installing ?? reg.waiting ?? <ServiceWorker>reg.active;
        if (self.mySW.state !== "activated") return;

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

        navigator.serviceWorker.addEventListener(
          "message",
          ({ data }: MessageEvent<Svc2Win>) => {
            if (data.type === WinSvcTp.user)
              return resolve((self.process = new Process(data.pid, data.uid)));
            svcMsgHandler(data);
          }
        );

        msg2Service({ type: WinSvcTp.user });
      })
      .catch(reject);
  });
}

await boot();

msg2Service({ type: WinSvcTp.process, uid: process.getuid() });
