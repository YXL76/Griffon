import { Process } from "./process";
import type { Win2Wkr } from "@griffon/shared";
import { WinWkrTp } from "@griffon/shared";
import { require } from "@griffon/libnode-globals";

declare const self: WorkerGlobalScope &
  typeof globalThis & { process?: Process };

self.addEventListener("message", ({ data }: MessageEvent<Win2Wkr>) => {
  switch (data.type) {
    case WinWkrTp.process:
      self.process = new Process(data.uid, data.pid, data.ppid, data.cwd);
      break;
    case WinWkrTp.code:
      /** @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval! Never use eval()!} */
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      Function("require", data.code).call(self, require);
      break;
  }
});
