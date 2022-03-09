import type {
  FSMsg,
  FSRet,
  FSRetWithError,
  IFileSystem,
  Win2Svc,
  Win2SvcChan,
  Win2SvcMap,
  Wkr2Svc,
} from "@griffon/shared";
import { FileSystem } from "./fs";
import { WinSvcChanTp } from "@griffon/shared";

let maxUid = 0;
let maxPid = 0;

export function winMsgHandler(source: Client, data: Win2Svc) {
  switch (data._t) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}

function winChanMsgDataHandler<D extends Win2SvcChan>(
  data: D
): Win2SvcMap[D["_t"]]["data"] {
  switch (data._t) {
    case WinSvcChanTp.user:
      return { uid: ++maxUid, pid: ++maxPid };
    case WinSvcChanTp.proc:
      return { pid: ++maxPid };
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}

export function winChanMsgHandler(port: MessagePort, data: Win2SvcChan) {
  port.postMessage(winChanMsgDataHandler(data));
}

async function fsMsgDataHandler<K extends keyof IFileSystem>(
  data: FSMsg<K>
): Promise<FSRetWithError<K>> {
  type Fn = (...args: Parameters<IFileSystem[K]>) => ReturnType<IFileSystem[K]>;
  try {
    const fs = FileSystem.getInstance();
    const ret = (await (fs[data._fn] as Fn)(...data.args)) as FSRet<K>;
    return { data: ret };
  } catch (err) {
    return typeof err === "string" ? { err } : { err: "" };
  }
}

export async function fsMsgHandler<K extends keyof IFileSystem>(
  port: MessagePort,
  data: FSMsg<K>
) {
  port.postMessage(await fsMsgDataHandler(data));
}

export function wkrMsgHandler(source: Client, data: Wkr2Svc) {
  switch (data._t) {
    /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */ default:
      throw Error(`Unknown message type from window: ${JSON.stringify(data)}`);
  }
}
