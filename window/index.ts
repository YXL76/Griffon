import type { Svc2Win, Win2SvcMap } from "@griffon/shared";
import { chanMsg2Svc, svcMsgHandler, svcMsgPool } from "./helper";
import { Process } from "./process";
import { WinSvcTp } from "@griffon/shared";

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

        navigator.serviceWorker.addEventListener(
          "message",
          <K extends WinSvcTp>({
            data,
          }: MessageEvent<Svc2Win | Win2SvcMap[K]>) => {
            if ("chan" in data) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const { resolve } = svcMsgPool.get(data.chan)!;
              resolve(data.data);
              svcMsgPool.delete(data.chan);
            } else svcMsgHandler(data);
          }
        );

        return chanMsg2Svc({ type: WinSvcTp.user });
      })
      .then(({ uid, pid }) => resolve((self.process = new Process(pid, uid))))
      .catch(reject);
  });
}

await boot();
await process._newChildProcess();
