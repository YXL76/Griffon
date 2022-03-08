import { Process } from "./process";
import type { Win2Wkr } from "@griffon/shared";
import { WinWkrTp } from "@griffon/shared";
import { require } from "@griffon/libnode-globals";

declare const self: WorkerGlobalScope &
  typeof globalThis & { process?: Process };

self.addEventListener("message", ({ data }: MessageEvent<Win2Wkr>) => {
  switch (data.type) {
    case WinWkrTp.proc: {
      const { uid, pid, ppid, cwd, sab } = data;
      self.process = new Process(uid, pid, ppid, cwd, sab);
      break;
    }
    case WinWkrTp.code:
      /** @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval! Never use eval()!} */
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      Function("require", data.code).call(self, require);
      break;
  }
});
