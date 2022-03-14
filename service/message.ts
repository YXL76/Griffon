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
    if ((<{ chan?: true }>data).chan) winChanHandler(ports, data);
    else winHandler(ports, data);
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
  }
};
self.onmessageerror = console.error;

function winHandler(ports: ReadonlyArray<MessagePort>, data: Win2Svc) {
  const source = ports[0];
  switch (data._t) {
    case WinSvcTp.proc: {
      source.onmessage = wkrListener;
      source.onmessageerror = console.error;
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

  const source = ports[0];
  source.postMessage(winChanDataHandler(ports, data));
}

function wkrListener({ data, ports }: MessageEvent) {
  /* eslint-disable @typescript-eslint/no-unsafe-argument */
  if ((<{ chan?: true }>data).chan) wkrChanHandler(ports, data);
  else wkrHandler(ports, data);
  /* eslint-enable @typescript-eslint/no-unsafe-argument */
}

function wkrHandler(ports: ReadonlyArray<MessagePort>, data: Wkr2Svc) {
  const source = ports[0];
  switch (data._t) {
    case WkrSvcTp.proc:
      source.onmessage = wkrListener;
      source.onmessageerror = console.error;
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

  const source = ports[0];
  source.postMessage(wkrChanDataHandler(ports, data));
}
