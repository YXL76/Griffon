import { winChanMsgHandler, winMsgHandler, wkrMsgHandler } from "./helper";
import type { Wkr2Svc } from "@griffon/shared";

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
        if (ports.length === 2) {
          ports[0].onmessage = winMsgHandler.bind(undefined, ports[0]);
          ports[1].onmessage = winChanMsgHandler.bind(undefined, ports[1]);
        }
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
