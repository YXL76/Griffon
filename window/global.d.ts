import type { Process } from "./process";

/* eslint-disable no-var */
declare global {
  var mySW: ServiceWorker;
  var mySWR: ServiceWorkerRegistration;
  var process: Process;
  var svcOneWay: MessagePort;
  var svcTwoWay: MessagePort;
}
/* eslint-enable no-var */
