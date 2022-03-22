import { ParentChildTp, WinWkrTp } from "@griffon/shared";
import {
  addSignalListener,
  dispatchSignalEvent,
  removeSignalListener,
} from "./signals";
import { msg2Parent, msg2Win, winHandler } from "./message";
import { Deno } from "@griffon/deno-std";
import { DenoProcess } from "./process";
import type { Parent2Child } from "@griffon/shared";
import { defaultSigHdls } from "./signals";

self.Deno = Deno;
hackDeno();

self.onmessage = ({ data, ports }: MessageEvent<Parent2Child>) => {
  switch (data._t) {
    case ParentChildTp.proc: {
      const { pid, uid, ppid, cwd, wid, sab, winSab } = data;

      self.Deno.pid = pid;
      self.Deno._uid_ = uid;
      self.Deno.ppid = ppid;
      self.Deno._cwd_ = cwd;

      self.WID = wid;
      self.SAB = sab;
      self.WIN_SAB = winSab;
      self.WIN_SAB32 = new Int32Array(winSab);
      self.WIN = ports[0];
      self.WIN.onmessage = winHandler;
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
  }
};

self.onmessageerror = console.error;

function hackDeno() {
  self.Deno.env.set("HOME", `/home/${self.Deno._uid_}`);

  self.Deno.exit = (code = 0) => {
    msg2Parent({ _t: ParentChildTp.exit, code });
    return self.close() as never;
  };

  self.Deno.addSignalListener = addSignalListener;

  self.Deno.removeSignalListener = removeSignalListener;

  self.Deno.run = (opt: Parameters<typeof Deno.run>[0]) => new DenoProcess(opt);

  self.Deno.kill = (pid, sig) => {
    if (!Object.hasOwn(defaultSigHdls, sig))
      throw new TypeError(`Unknown signal: ${sig}`);

    msg2Win({ _t: WinWkrTp.kill, pid, sig });
  };

  self.Deno.sleepSync = (millis) => {
    const sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    Atomics.wait(new Int32Array(sab), 0, 0, millis);
  };
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
