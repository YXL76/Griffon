import { CONST, WinSvcChanTp, WinSvcTp } from "@griffon/shared";
import { Channel, msg2Svc } from "./message";
import { Deno } from "@griffon/deno-std";
import { DenoProcess } from "./process";

export async function boot() {
  self.Deno = Deno;
  const swc = navigator.serviceWorker;
  return swc
    .register(CONST.serviceURL, { type: "module", scope: "/" })
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
      if (self.SW !== swc.controller)
        throw Error("Service worker not activated");
      console.log("Service worker activated");

      return Channel.svc({ _t: WinSvcChanTp.user });
    })
    .then(({ uid, pid }) => {
      self.Deno._uid_ = uid;
      self.Deno.pid = pid;
      self.Deno._cwd_ = `/home/${uid}`;
      hackDeno();
      self.addEventListener("unload", () =>
        msg2Svc({ _t: WinSvcTp.exit, pid: self.Deno.pid })
      );
      return hackNode();
    });
}

function hackDeno() {
  self.Deno.exit = () => self.close() as never;

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
