export {};

const registration = await navigator.serviceWorker.register("./service.js", {
  type: "module",
});

const serviceWorker = await new Promise<ServiceWorker>((resolve) => {
  const sw =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    registration.installing ?? registration.waiting ?? registration.active!;
  if (sw.state === "activated") return resolve(sw);

  const listener = () => {
    if (sw.state === "activated") {
      resolve(sw);
      sw.removeEventListener("statechange", listener);
    }
  };
  sw.addEventListener("statechange", listener);
});
if (serviceWorker !== navigator.serviceWorker.controller)
  throw Error("Service worker not activated");

console.log("Service worker activated");

navigator.serviceWorker.addEventListener("message", ({ data }) => {
  console.log("Received message:", data);
  const worker = new Worker("task.js", { type: "module" });
  worker.postMessage({ type: "process", pid: data.pid, ppid: 0, cwd: "/" });
  worker.postMessage({
    type: "code",
    code: `'use strict';
    const { basename, win32, dirname, extname, isAbsolute, join } = require("path");

    console.log(basename("/foo/bar/baz/asdf/quux.html"));
    console.log(win32.basename("C:\\\\foo.html", ".html"));
    console.log(dirname("/foo/bar/baz/asdf/quux"));
    console.log(extname("index.html"));
    console.log(isAbsolute("/foo/bar"));
    console.log(join("/foo", "bar", "baz/asdf", "quux", ".."));
    
    console.log(process.cwd());`,
  });
});

serviceWorker.postMessage({ type: "new-window" });
