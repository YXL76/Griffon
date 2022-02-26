import type { Win2Svc, Wkr2Svc } from "@griffon/shared";
import { winMsgHandler, wkrMsgHandler } from "./helper";

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

self.addEventListener("message", ({ data, source }) => {
  if (!source) return;
  if (Object.prototype.hasOwnProperty.call(source, "type")) {
    switch ((source as Client).type) {
      case "window":
        winMsgHandler(data as Win2Svc, source as Client);
        break;
      case "worker":
        wkrMsgHandler(data as Wkr2Svc, source as Client);
        break;
    }
  }
});

function boot() {
  // noop
}
