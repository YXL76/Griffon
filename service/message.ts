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
    if ((<{ chan?: true }>data).chan) winChanHandler(ports[0], data);
    else winHandler(ports[0], data);
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
  }
};
self.onmessageerror = console.error;

function winHandler(source: MessagePort, data: Win2Svc) {
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

function winChanDataHandler<D extends Win2SvcChan>(
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

function winChanHandler(source: MessagePort, data: Win2SvcChan) {
  source.postMessage(winChanDataHandler(data));
}

function wkrListener({ data, ports }: MessageEvent) {
  /* eslint-disable @typescript-eslint/no-unsafe-argument */
  if ((<{ chan?: true }>data).chan) wkrChanHandler(ports[0], data);
  else wkrHandler(ports[0], data);
  /* eslint-enable @typescript-eslint/no-unsafe-argument */
}

function wkrHandler(source: MessagePort, data: Wkr2Svc) {
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

function wkrChanHandler(source: MessagePort, data: Wkr2SvcChan) {
  function wkrChanDataHandler<D extends Wkr2SvcChan>(
    data: D
  ): Wkr2SvcMap[D["_t"]]["data"] {
    switch (data._t) {
      case WkrSvcChanTp.none:
        return {};
    }
  }

  source.postMessage(wkrChanDataHandler(data));
}
