import { Console, Deno, PCB, RESC_TABLE } from "@griffon/deno-std";
import {
  NullFile,
  ParentChildTp,
  StdioReadOnlyFile,
  StdioWriteOnlyFile,
  WinWkrTp,
  fsSyncHandler,
  hackDenoFS,
  textEncoder,
} from "@griffon/shared";
import {
  addSignalListener,
  dispatchSignalEvent,
  removeSignalListener,
} from "./signals";
import { msg2Parent, msg2Win, winHandler } from "./message";
import type { Parent2Child } from "@griffon/shared";
import { Process } from "./process";
import type { Resource } from "@griffon/deno-std";
import { defaultSigHdls } from "./signals";

self.Deno = Deno;
void hackDeno().then((rootfs) => (self.ROOT_FS = rootfs));

self.onmessage = ({ data, ports }: MessageEvent<Parent2Child>) => {
  switch (data._t) {
    case ParentChildTp.proc: {
      Deno.pid = data.pid;
      PCB.uid = data.uid;
      Deno.ppid = data.ppid;
      PCB.cwd = data.cwd;
      Deno.args = data.args;

      self.WID = data.wid;
      self.SAB = data.sab;
      self.WIN_SAB = data.winSab;
      self.WIN_SAB32 = new Int32Array(data.winSab);
      self.WIN = ports[0];
      self.WIN.onmessage = winHandler;

      PCB.stdin = data.stdin;
      PCB.stdout = data.stdout;
      PCB.stderr = data.stderr;

      for (const [key, val] of Object.entries(data.env)) Deno.env.set(key, val);

      break;
    }
    case ParentChildTp.node:
      hackNode()
        .then((require) => {
          /** @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval! Never use eval()!} */
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          return new Function(
            "require",
            "module",
            "console",
            `return (async () => { ${data.code} })()`
          )(
            require,
            {},
            new Console((msg, level) => {
              if (level > 1) void Deno.stderr.write(textEncoder.encode(msg));
              else void Deno.stdout.write(textEncoder.encode(msg));
            })
          ) as Promise<void>;
        })
        .catch((err: Error | string) => {
          console.error(self.name, `${err.toString()}`);
          Deno.exit((process as { exitCode?: number })?.exitCode || 1); // The process exit unsuccessfully.
        });
      break;
    case ParentChildTp.deno:
      /* eslint-disable-next-line @typescript-eslint/no-implied-eval */ (
        new Function("console", `return (async () => { ${data.code} })()`)(
          new Console((msg, level) => {
            if (level > 1) void Deno.stderr.write(textEncoder.encode(msg));
            else void Deno.stdout.write(textEncoder.encode(msg));
          })
        ) as Promise<void>
      ).catch((err: Error | string) => {
        console.error(self.name, `${err.toString()}`);
        Deno.exit((process as { exitCode?: number })?.exitCode || 1); // The process exit unsuccessfully.
      });
      break;
    case ParentChildTp.kill:
      dispatchSignalEvent(data.sig);
      break;
    case ParentChildTp.stdin: {
      let node: Resource;
      if (PCB.stdin === "null") node = new NullFile("childStdin");
      else if (PCB.stdin === "piped") {
        node = new StdioReadOnlyFile("childStdin", ports[0]);
      } else node = new NullFile("childStdin");

      RESC_TABLE.add(node);
      break;
    }
    case ParentChildTp.stdout: {
      let node: Resource;
      if (PCB.stdout === "null") node = new NullFile("childStdout");
      else if (PCB.stdout === "piped") {
        node = new StdioWriteOnlyFile("childStdout", ports[0]);
      } else node = new NullFile("childStdout");

      RESC_TABLE.add(node);
      break;
    }
    case ParentChildTp.stderr: {
      let node: Resource;
      if (PCB.stderr === "null") node = new NullFile("childStderr");
      else if (PCB.stderr === "piped") {
        node = new StdioWriteOnlyFile("childStderr", ports[0]);
      } else node = new NullFile("childStderr");

      RESC_TABLE.add(node);
      break;
    }
    case ParentChildTp.fsSync:
      void fsSyncHandler(self.ROOT_FS, data, ports);
  }
};

self.onmessageerror = console.error;

function hackDeno() {
  Deno.exit = (code = 0) => {
    msg2Parent({ _t: ParentChildTp.exit, code });
    return undefined as never;
  };

  Deno.addSignalListener = addSignalListener;

  Deno.removeSignalListener = removeSignalListener;

  Deno.run = (opt) => new Process(opt);

  Deno.kill = (pid, sig) => {
    if (!Object.hasOwn(defaultSigHdls, sig))
      throw new TypeError(`Unknown signal: ${sig}`);

    msg2Win({ _t: WinWkrTp.kill, pid, sig });
  };

  Deno.sleepSync = (millis) => {
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
