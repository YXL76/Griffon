import type { Process } from "./process";

/* eslint-disable no-var */
declare global {
  var mySW: ServiceWorker;
  var mySWR: ServiceWorkerRegistration;
  var process: Process;
}
/* eslint-enable no-var */
