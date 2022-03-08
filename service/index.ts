import type { Win2Svc, Win2SvcChan, Wkr2Svc } from "@griffon/shared";
import { winChanMsgHandler, winMsgHandler, wkrMsgHandler } from "./helper";

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
  if ("type" in source /* Client */) {
    switch (source.type) {
      case "window":
        if ("chan" in data) winChanMsgHandler(data as Win2SvcChan, source);
        else winMsgHandler(data as Win2Svc, source);
        break;
      case "worker":
        wkrMsgHandler(data as Wkr2Svc, source);
        break;
    }
  }
});

function boot() {
  // noop
}
