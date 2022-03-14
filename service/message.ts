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
    case WinSvcTp.proc: {
      ports[0].onmessage = wkrListener;
      ports[0].onmessageerror = console.error;
      break;
    }
    case WinSvcTp.exit:
      pTree.del(data.pid);
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
        pTree.set(pid);
        return { uid: pTree.nextUid, pid };
      }
    }
  }

  ports[0].postMessage(winChanDataHandler(ports, data));
}

function wkrListener({ data, source, ports }: MessageEvent) {
  if (source instanceof MessagePort) {
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    if (ports.length) wkrChanHandler(ports, data);
    else wkrHandler(ports, data);
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
  }
}

function wkrHandler(ports: ReadonlyArray<MessagePort>, data: Wkr2Svc) {
  switch (data._t) {
    case WkrSvcTp.proc:
      ports[0].onmessage = wkrListener;
      ports[0].onmessageerror = console.error;
      break;
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
      case WkrSvcChanTp.pid: {
        const pid = pTree.nextPid;
        pTree.set(pid, data.ppid);
        return { pid };
      }
    }
  }

  ports[0].postMessage(wkrChanDataHandler(ports, data));
}
