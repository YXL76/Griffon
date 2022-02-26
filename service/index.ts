import type { Svc2Win, Win2Svc } from "@griffon/shared";
import { WinSvcTp } from "@griffon/shared";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

{
  const f = async () => {
    console.log("Installing Service Worker");
    await self.skipWaiting();
  };
  self.addEventListener("install", (e) => e.waitUntil(f()), { once: true });
}

{
  const f = async () => {
    console.log("Activating Service Worker");
    await self.clients.claim();
    boot();
  };
  self.addEventListener("activate", (e) => e.waitUntil(f()), { once: true });
}

type MessageEvent = Omit<ExtendableMessageEvent, "data"> & { data: Win2Svc };

let maxUid = 0;
let maxPid = 0;

self.addEventListener("message", ({ data, source }: MessageEvent) => {
  switch (data.type) {
    case WinSvcTp.user:
      if (source) {
        const msg: Svc2Win = {
          type: WinSvcTp.user,
          uid: ++maxUid,
          pid: ++maxPid,
        };
        source.postMessage(msg);
      }
      break;
    case WinSvcTp.process:
      if (source) {
        const msg: Svc2Win = { type: WinSvcTp.process, pid: ++maxPid };
        source.postMessage(msg);
      }
      break;
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      console.error(`Unknown message type from window: ${data}`);
  }
});

function boot() {
  // new Task();
}
