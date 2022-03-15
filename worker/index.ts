import { Deno } from "@griffon/deno-std";
import { DenoProcess } from "./process";
import type { Parent2Child } from "@griffon/shared";
import { ParentChildTp } from "@griffon/shared";
import { msg2Parent } from "./message";

self.Deno = Deno;
hackDeno();

self.onmessage = ({ data, ports }: MessageEvent<Parent2Child>) => {
  switch (data._t) {
    case ParentChildTp.proc: {
      const { uid, ppid, cwd, sab } = data;

      self.Deno._uid_ = uid;
      self.Deno.ppid = ppid;
      self.Deno._cwd_ = cwd;

      self.SAB = sab;
      self.SW = ports[0];
      break;
    }
    case ParentChildTp.pid:
      self.Deno.pid = data.pid;
      break;
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
  }
};

self.onmessageerror = console.error;

function hackDeno() {
  self.Deno.exit = (code = 0) => {
    msg2Parent({ _t: ParentChildTp.exit, code });
    return self.close() as never;
  };

  self.Deno.run = (opt: Parameters<typeof Deno.run>[0]) => new DenoProcess(opt);
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
