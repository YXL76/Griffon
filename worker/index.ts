import { Process, require } from "@griffon/libnode-globals";

declare const self: WorkerGlobalScope &
  typeof globalThis & { process?: Process };

type Msg =
  | { type: "process"; pid: number; ppid: number; cwd: string }
  | { type: "code"; code: string };

self.addEventListener("message", ({ data }: MessageEvent<Msg>) => {
  switch (data.type) {
    case "process":
      self.process = new Process(data.pid, data.ppid, data.cwd);
      break;
    case "code":
      /** @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval! Never use eval()!} */
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      Function("require", data.code).call(self, require);
      break;
  }
});
