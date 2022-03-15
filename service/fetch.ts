import { FetchPath } from "@griffon/shared";
import { pTree } from "./state";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const { origin } = self.location;

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === origin) {
    switch (url.pathname) {
      case FetchPath.pid: {
        const pid = pTree.nextPid;
        const ppid = url.searchParams.get("ppid");
        if (ppid) pTree.set(pid, parseInt(ppid, 10));
        else pTree.set(pid);
        return event.respondWith(new Response(pid.toString(10)));
      }
    }
  }
});
