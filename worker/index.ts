import { Deno, PCB } from "@griffon/deno-std";
import {
  ParentChildTp,
  WinWkrTp,
  fsSyncHandler,
  hackDenoFS,
} from "@griffon/shared";
import {
  addSignalListener,
  dispatchSignalEvent,
  removeSignalListener,
} from "./signals";
import { msg2Parent, msg2Win, winHandler } from "./message";
import type { Parent2Child } from "@griffon/shared";
import { Process } from "./process";
import { defaultSigHdls } from "./signals";

self.Deno = Deno;
void hackDeno().then((rootfs) => (self.ROOT_FS = rootfs));

self.onmessage = ({ data, ports }: MessageEvent<Parent2Child>) => {
  switch (data._t) {
    case ParentChildTp.proc: {
      const { pid, uid, ppid, cwd, env, wid, sab, winSab } = data;

      self.Deno.pid = pid;
      PCB.uid = uid;
      self.Deno.ppid = ppid;
      PCB.cwd = cwd;

      self.WID = wid;
      self.SAB = sab;
      self.WIN_SAB = winSab;
      self.WIN_SAB32 = new Int32Array(winSab);
      self.WIN = ports[0];
      self.WIN.onmessage = winHandler;

      for (const [key, val] of Object.entries(env)) self.Deno.env.set(key, val);

      break;
    }
    case ParentChildTp.code:
      hackNode()
        .then((require) => {
          /** @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval! Never use eval()!} */
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          new Function("require", data.code)(require);
        })
        .catch((err: Error | string) => {
          console.error(self.name, `${err.toString()}`);
          self.Deno.exit((process as { exitCode?: number })?.exitCode || 1); // The process exit unsuccessfully.
        });
      break;
    case ParentChildTp.kill:
      dispatchSignalEvent(data.sig);
      break;
    case ParentChildTp.fsSync:
      void fsSyncHandler(self.ROOT_FS, data, ports);
  }
};

self.onmessageerror = console.error;

function hackDeno() {
  self.Deno.exit = (code = 0) => {
    msg2Parent({ _t: ParentChildTp.exit, code });
    return self.close() as never;
  };

  self.Deno.addSignalListener = addSignalListener;

  self.Deno.removeSignalListener = removeSignalListener;

  self.Deno.run = (opt) => new Process(opt);

  self.Deno.kill = (pid, sig) => {
    if (!Object.hasOwn(defaultSigHdls, sig))
      throw new TypeError(`Unknown signal: ${sig}`);

    msg2Win({ _t: WinWkrTp.kill, pid, sig });
  };

  self.Deno.sleepSync = (millis) => {
    const sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    Atomics.wait(new Int32Array(sab), 0, 0, millis);
  };

  return hackDenoFS(self.postMessage.bind(self));
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
