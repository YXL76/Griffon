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

self.addEventListener("message", ({ data, source, ports }) => {
  if (!source) return;
  if ("type" in source /* Client */) {
    switch (source.type) {
      case "window":
        if (ports.length) winChanMsgHandler(ports[0], data as Win2SvcChan);
        else winMsgHandler(source, data as Win2Svc);
        break;
      case "worker":
        wkrMsgHandler(source, data as Wkr2Svc);
        break;
    }
  }
});

function boot() {
  // noop
}
