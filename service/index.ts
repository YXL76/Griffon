import { Task } from "./task";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

self.addEventListener(
  "install",
  (e) => e.waitUntil(() => console.log("Installing Service Worker")),
  { once: true }
);

self.addEventListener(
  "activate",
  (e) =>
    e.waitUntil(async () => {
      console.log("Activating Service Worker");
      await self.clients.claim();
      boot();
    }),
  { once: true }
);

function boot() {
  // new Task();
}
