import { CONST, WinSvcChanTp, WinSvcTp } from "@griffon/shared";
import { Channel, msg2Svc } from "./message";
import { addSignalListener, removeSignalListener } from "./signals";
import { Deno } from "@griffon/deno-std";
import { DenoProcess } from "./process";

export async function boot() {
  self.Deno = Deno;
  self.SWC = navigator.serviceWorker;
  // Pretend the max child process number is 64.
  self.SAB = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 64);
  self.SAB32 = new Int32Array(self.SAB);

  return self.SWC.register(CONST.serviceURL, { type: "module", scope: "/" })
    .then((reg) => {
      self.SWR = reg;
      self.SW = reg.installing ?? reg.waiting ?? <ServiceWorker>reg.active;
      if (self.SW.state === "activated") return;

      return new Promise((resolve) => {
        const listener = () => {
          if (self.SW.state === "activated")
            resolve(self.SW.removeEventListener("statechange", listener));
        };
        self.SW.addEventListener("statechange", listener);
      });
    })
    .then(() => {
      if (self.SW !== self.SWC.controller)
        throw Error("Service worker not activated");
      console.log("Service worker activated");

      return Channel.svc({ _t: WinSvcChanTp.user });
    })
    .then(({ pid }) => {
      Object.defineProperty(self, "NEXT_PID", { get: () => ++pid });

      self.Deno._uid_ = pid / CONST.pidUnit;
      self.Deno.pid = pid;
      self.Deno._cwd_ = `/home/${self.Deno._uid_}`;
      hackDeno();

      self.addEventListener("unload", () =>
        msg2Svc({ _t: WinSvcTp.exit, pid: self.Deno.pid })
      );

      return hackNode();
    });
}

function hackDeno() {
  self.Deno.exit = () => self.close() as never;

  self.Deno.addSignalListener = addSignalListener;

  self.Deno.removeSignalListener = removeSignalListener;

  self.Deno.run = (opt: Parameters<typeof Deno.run>[0]) => new DenoProcess(opt);

  self.Deno.kill = (pid, sig) => {
    /* if (!Object.hasOwn(SIGNALS, sig))
      throw new TypeError(`Unknown signal: ${sig}`);

    if (pid === self.Deno.pid)
      self.SWC.dispatchEvent(new MessageEvent("message", { data: { sig } }));
    else msg2Svc({ _t: WinSvcTp.kill, pid, sig }); */
  };

  self.Deno.sleepSync = (millis) => {
    // No recommended way to sleep.
    const start = performance.now();
    while (performance.now() - start < millis) {
      // Do nothing.
    }
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

const require = await boot();

{
  const { basename, dirname, extname, isAbsolute, join } = require("path");
  const { spawn } = require("child_process");

  console.log(basename("/foo/bar/baz/asdf/quux.html"));
  console.log(dirname("/foo/bar/baz/asdf/quux"));
  console.log(extname("index.html"));
  console.log(isAbsolute("/foo/bar"));
  console.log(join("/foo", "bar", "baz/asdf", "quux", ".."));

  console.log(process.cwd());

  const node = spawn("node", { stdio: "ignore" });
  node.on("close", (code) =>
    console.log(`child process exited with code ${code}`)
  );
}
