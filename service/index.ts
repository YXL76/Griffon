import {
  fsMsgHandler,
  winChanMsgHandler,
  winMsgHandler,
  wkrMsgHandler,
} from "./helper";

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
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    switch (source.type) {
      case "window":
        if (ports.length) {
          if ((<{ _t?: number }>data)._t) winChanMsgHandler(ports[0], data);
          else void fsMsgHandler(ports[0], data);
        } else winMsgHandler(source, data);
        break;
      case "worker":
        wkrMsgHandler(source, data);
        break;
    }
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
  }
});

function boot() {
  // noop
}
