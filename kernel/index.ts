import { Task } from "./task";

const enum Scope {
    window,
    serviceWorker,
    unknwon,
}

// Check scope
const scope: Scope = (() => {
    if (typeof self !== "object") return Scope.unknwon;
    // @ts-ignore
    if (typeof Window === "function" && self instanceof Window) {
        // @ts-ignore
        if (typeof window === "object" && self === window) return Scope.window;
    }
    if (
        typeof ServiceWorkerGlobalScope === "function" &&
        self instanceof ServiceWorkerGlobalScope
    )
        return Scope.serviceWorker;
    return Scope.unknwon;
})();

if (scope === Scope.unknwon) throw Error("Unable to determine scope");
else if (scope === Scope.window) {
    boot();
} else if (scope === Scope.serviceWorker) {
    const sw = <ServiceWorkerGlobalScope & typeof globalThis>self;

    sw.addEventListener(
        "install",
        (e) => e.waitUntil(() => console.log("Installing Service Worker")),
        { once: true }
    );

    sw.addEventListener(
        "activate",
        (e) =>
            e.waitUntil(() => {
                console.log("Activating Service Worker");
                sw.clients.claim();
                boot();
            }),
        { once: true }
    );
}

function boot() {
    new Task();
}
