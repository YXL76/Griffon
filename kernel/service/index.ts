const sw = self as ServiceWorkerGlobalScope & typeof globalThis;

sw.addEventListener("install", (e) =>
    e.waitUntil(() => console.log("Installing Service Worker"))
);

sw.addEventListener("activate", (e) =>
    e.waitUntil(() => console.log("Activating Service Worker"))
);
Function.apply(null, []);
