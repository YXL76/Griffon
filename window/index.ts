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
