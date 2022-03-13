import { Deno } from "@griffon/deno-std";
import type { Parent2Child } from "@griffon/shared";
import { ParentChildTp } from "@griffon/shared";
import { msg2Parent } from "./message";

self.Deno = Deno;
hackDeno();

self.onmessage = ({ data, ports }: MessageEvent<Parent2Child>) => {
  switch (data._t) {
    case ParentChildTp.proc: {
      const { uid, pid, ppid, cwd } = data;
      self.Deno._uid_ = uid;
      self.Deno.pid = pid;
      self.Deno.ppid = ppid;
      self.Deno._cwd_ = cwd;

      self.SW = ports[0];
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
          self.Deno.exit(1); // The process exit unsuccessfully.
        });
  }
};

function hackDeno() {
  self.Deno.exit = (code = 0) => {
    msg2Parent({ _t: ParentChildTp.exit, code });
    return self.close() as never;
  };
}

/**
 * Must be called after {@linkcode hackDeno}, because
 * it needs Deno global object.
 */
async function hackNode() {
  const { createRequire } = await import(
    "@griffon/deno-std/deno_std/node/module"
  );
  const require = createRequire("/");
  return require;
}
