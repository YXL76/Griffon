import type { Process } from "./process";

export declare global {
  let mySW: ServiceWorker;
  let mySWR: ServiceWorkerRegistration;
  let process: Process;
}
