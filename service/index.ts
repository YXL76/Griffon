export {};

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

let maxPid = 0;

self.addEventListener("message", ({ data, source }) => {
  switch (data.type) {
    case "new-window":
      source?.postMessage({ type: "new-window", pid: ++maxPid });
      break;
  }
});

function boot() {
  // new Task();
}
