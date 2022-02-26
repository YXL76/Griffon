import { msg2Service, svcMsgHandler } from "./helper";
import { Process } from "./process";
import type { Svc2Win } from "@griffon/shared";
import { WinSvcTp } from "@griffon/shared";

export async function boot() {
  return new Promise<Process>((resolve, reject) => {
    navigator.serviceWorker
      .register("./service.js", { type: "module" })
      .then((reg) => {
        mySWR = reg;
        mySW = reg.installing ?? reg.waiting ?? (reg.active as ServiceWorker);
        if (mySW.state !== "activated") return;

        return new Promise<void>((resolve) => {
          const listener = () => {
            if (mySW.state === "activated")
              resolve(mySW.removeEventListener("statechange", listener));
          };
          mySW.addEventListener("statechange", listener);
        });
      })
      .then(() => {
        if (mySW !== navigator.serviceWorker.controller)
          throw Error("Service worker not activated");
        console.log("Service worker activated");

        navigator.serviceWorker.addEventListener(
          "message",
          ({ data }: MessageEvent<Svc2Win>) => {
            if (data.type === WinSvcTp.user)
              return resolve((process = new Process(data.pid, data.uid)));
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
