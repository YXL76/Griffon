import type {
  Win2Svc,
  Win2SvcChan,
  Win2SvcMap,
  Wkr2Svc,
  Wkr2SvcChan,
  Wkr2SvcMap,
} from "@griffon/shared";
import {
  WinSvcChanTp,
  WinSvcTp,
  WkrSvcChanTp,
  WkrSvcTp,
} from "@griffon/shared";
import { pTree } from "./state";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

self.onmessage = ({ data, source, ports }) => {
  if (source instanceof Client && source.type === "window") {
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    if (ports.length) winChanHandler(ports, data);
    else winHandler(ports, data);
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
  }
};
self.onmessageerror = console.error;

function winHandler(ports: ReadonlyArray<MessagePort>, data: Win2Svc) {
  switch (data._t) {
    case WinSvcTp.exit:
      pTree.del(data.pid);
      break;
    case WinSvcTp.proc: {
      const pid = pTree.nextPid;
      Atomics.store(data.sab, 0, pid);
      pTree.set(pid, data.ppid);
      break;
    }
    case WinSvcTp.port:
      ports[0].onmessage = wkrListener;
      ports[0].onmessageerror = console.error;
      break;
  }
}

function winChanHandler(ports: ReadonlyArray<MessagePort>, data: Win2SvcChan) {
  function winChanDataHandler<D extends Win2SvcChan>(
    ports: ReadonlyArray<MessagePort>,
    data: D
  ): Win2SvcMap[D["_t"]]["data"] {
    switch (data._t) {
      case WinSvcChanTp.user: {
        const pid = pTree.nextPid;
        const sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
        pTree.set(pid);
        return { uid: pTree.nextUid, pid, sab };
      }
    }
  }

  ports[0].postMessage(winChanDataHandler(ports, data));
}

function wkrListener({ data, source, ports }: MessageEvent) {
  if (source instanceof MessagePort) {
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    if (ports.length) wkrChanHandler(ports, data);
    else wkrHandler(source, data);
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
  }
}

function wkrHandler(source: MessagePort, data: Wkr2Svc) {
  switch (data._t) {
    case WkrSvcTp.exit:
      pTree.del(data.pid);
      break;
  }
}

function wkrChanHandler(ports: ReadonlyArray<MessagePort>, data: Wkr2SvcChan) {
  function wkrChanDataHandler<D extends Wkr2SvcChan>(
    ports: ReadonlyArray<MessagePort>,
    data: D
  ): Wkr2SvcMap[D["_t"]]["data"] {
    switch (data._t) {
      case WkrSvcChanTp.proc: {
        const pid = pTree.nextPid;
        pTree.set(pid, data.ppid);
        ports[1].onmessage = wkrListener;
        ports[1].onmessageerror = console.error;
        return { pid };
      }
    }
  }

  ports[0].postMessage(wkrChanDataHandler(ports, data));
}
