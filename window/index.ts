import {
  CONST,
  ParentChildTp,
  WinSvcChanTp,
  WinSvcTp,
  WinWinTp,
  hackDenoFS,
  pid2Uid,
} from "@griffon/shared";
import { Channel, msg2Svc, winHandler } from "./message";
import type { Child2Parent, Win2Win } from "@griffon/shared";
import { Deno, PCB } from "@griffon/deno-std";
import {
  addSignalListener,
  defaultSigHdls,
  removeSignalListener,
} from "./signals";
import { Process } from "./process";

export type {
  IndexedDBStorageDevice,
  FileAccessStorageDevice,
} from "@griffon/shared";

export interface BootConfig {
  /**
   * NOTE: Some properties will be overrided.
   */
  env?: { [key: string]: string };
}

export async function boot({ env = {} }: BootConfig = {}) {
  const register = navigator.serviceWorker.register(CONST.serviceURL, {
    type: "module",
    scope: "/",
  });

  self.Deno = Deno;
  // Pretend the max child process number is 64.
  self.SAB = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 64);
  self.SAB32 = new Int32Array(self.SAB);

  self.addEventListener("message", winHandler);
  self.addEventListener("unload", () =>
    msg2Svc({ _t: WinSvcTp.exit, pid: self.Deno.pid })
  );

  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);

  self.SWR = await register;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  self.SW = self.SWR.installing ?? self.SWR.waiting ?? self.SWR.active!;
  if (self.SW.state !== "activated") {
    await new Promise((resolve) => {
      const listener = () => {
        if (self.SW.state === "activated")
          resolve(self.SW.removeEventListener("statechange", listener));
      };
      self.SW.addEventListener("statechange", listener);
    });
  }

  if (self.SW !== navigator.serviceWorker.controller)
    throw Error("Service worker not activated");
  console.log("Service worker activated");

  const { pid } = await Channel.svc({ _t: WinSvcChanTp.user });
  PCB.uid = pid2Uid(pid);
  self.Deno.pid = pid;

  const rootfs = await hackDeno();
  self.ROOT_FS = rootfs;
  const require = await hackNode();

  return { require, rootfs };
}

function hackDeno() {
  self.Deno.env.set("HOME", `/home/${PCB.uid}`);

  self.Deno.exit = () => self.close() as never;

  self.Deno.addSignalListener = addSignalListener;

  self.Deno.removeSignalListener = removeSignalListener;

  self.Deno.run = (opt) => new Process(opt);

  self.Deno.kill = (pid, sig) => {
    if (!Object.hasOwn(defaultSigHdls, sig))
      throw new TypeError(`Unknown signal: ${sig}`);

    const data: Win2Win = { _t: WinWinTp.kill, pid, sig };
    if (pid === self.Deno.pid || pid2Uid(pid) === PCB.uid) {
      self.dispatchEvent(new MessageEvent("message", { data }));
    } else self.postMessage(data, self.location.origin);
  };

  self.Deno.sleepSync = (millis) => {
    console.warn("Try not to use Deno.sleepSync in main thread.");
    const start = performance.now();
    while (performance.now() - start < millis) {
      // Do nothing.
    }
  };

  const worker = new Worker(CONST.workerURL, { type: "module" });
  worker.onmessage = ({ data }: MessageEvent<Child2Parent>) => {
    switch (data._t) {
      case ParentChildTp.exit:
        console.error("File System Worker exited unexpectedly.");
        worker.terminate();
        break;
      case ParentChildTp.fsSync:
        // noop
        break;
    }
  };
  worker.onmessageerror = console.error;

  return hackDenoFS(worker.postMessage.bind(worker));
}

/**
 * Must be called after {@link hackDeno}, because
 * it needs Deno global object.
 */
async function hackNode() {
  const { createRequire } = await import(
    "@griffon/deno-std/deno_std/node/module"
  );
  const require = createRequire("/");
  return require;
}
