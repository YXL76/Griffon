import { CONST, FetchPath, ParentChildTp, WinSvcTp } from "@griffon/shared";
import type { Child2Parent, Parent2Child } from "@griffon/shared";
import type { DenoType } from "@griffon/deno-std";
import { msg2Svc } from "./message";

async function askPid() {
  const res = await fetch(`${FetchPath.pid}?ppid=${self.Deno.pid}`);
  return parseInt(await res.text(), 10);
}

export async function askPids() {
  while (self.PRE_RSVD_PIDS.length <= 4)
    self.PRE_RSVD_PIDS.push(await askPid());
}

export class DenoProcess implements DenoType.Process {
  #worker?: Worker;

  #code = 0;

  #output = new Uint8Array();

  #stderrOutput = new Uint8Array();

  readonly #statusQueue: ((value: DenoType.ProcessStatus) => void)[] = [];

  readonly #outputQueue: ((value: Uint8Array) => void)[] = [];

  readonly #stderrOutputQueue: ((value: Uint8Array) => void)[] = [];

  readonly #sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);

  readonly rid = NaN;

  pid = 0;

  readonly stdin = null;

  readonly stdout = null;

  readonly stderr = null;

  constructor(
    opt: DenoType.RunOptions & {
      clearEnv?: boolean;
      gid?: number;
      uid?: number;
    }
  ) {
    const file = opt.cmd[0];
    if (file instanceof URL || (file !== "deno" && file !== "node"))
      throw new Error("Invalid command");

    /**
     * @notice Chromium need some time(about 20ms) to set up the worker.
     * Therefore, all `postMessage` will be delayed until the worker is ready.
     */
    this.#worker = new Worker(CONST.workerURL, { type: "module" });
    this.#worker.onmessage = ({ data }: MessageEvent<Child2Parent>) => {
      switch (data._t) {
        case ParentChildTp.exit:
          this.#code = data.code;
          this.close();
          break;
      }
    };
    this.#worker.onmessageerror = console.error;

    const cwd = opt.cwd ?? self.Deno._cwd_;
    const uid = opt.uid ?? self.Deno._uid_;
    const ppid = self.Deno.pid;
    const sab = new Int32Array(this.#sab);

    const pid = self.PRE_RSVD_PIDS.shift();
    if (pid) {
      this.pid = pid;
      this.#toChild({ _t: ParentChildTp.pid, pid });
    } else {
      void askPid().then((pid) => {
        this.pid = pid;
        this.#toChild({ _t: ParentChildTp.pid, pid });
      });
    }
    void askPids();

    // Make the child process can communicate with the Service Worker.
    const { port1, port2 } = new MessageChannel();
    msg2Svc({ _t: WinSvcTp.proc }, [port1]);
    this.#toChild({ _t: ParentChildTp.proc, ppid, cwd, uid, sab }, [port2]);

    // Temporary
    this.#toChild({
      _t: ParentChildTp.code,
      code: `const { createHash } = require("crypto");
const { spawn } = require("child_process");

const hash = createHash("sha256");

hash.on("readable", () => {
  const data = hash.read();
  if (data) console.log(process.pid, data.toString("hex"));
});

hash.write("some data to hash");
hash.end();

const node = spawn("node", { stdio: "ignore" });
node.on("close", (code) =>
  console.log(\`child process \${process.pid} exited with code \${code}\`)
);

setTimeout(() => process.exit(), 4000);`,
    });
  }

  status(): Promise<DenoType.ProcessStatus> {
    if (!this.#worker)
      return Promise.resolve(
        this.#code === 0
          ? { success: true, code: this.#code }
          : { success: false, code: this.#code }
      );

    return new Promise((resolve) => this.#statusQueue.push(resolve));
  }

  output(): Promise<Uint8Array> {
    if (!this.#worker) return Promise.resolve(this.#output);

    return new Promise((resolve) => this.#outputQueue.push(resolve));
  }

  stderrOutput(): Promise<Uint8Array> {
    if (!this.#worker) return Promise.resolve(this.#stderrOutput);

    return new Promise((resolve) => this.#stderrOutputQueue.push(resolve));
  }

  close() {
    if (!this.#worker) return;

    msg2Svc({ _t: WinSvcTp.exit, pid: this.pid });
    this.#worker.terminate();
    this.#worker = undefined;

    if (this.#statusQueue.length) {
      const status: DenoType.ProcessStatus =
        this.#code === 0
          ? { success: true, code: this.#code }
          : { success: false, code: this.#code };
      this.#statusQueue.forEach((q) => q(status));
      this.#statusQueue.length = 0;
    }
    if (this.#outputQueue.length) {
      this.#outputQueue.forEach((q) => q(this.#output));
      this.#outputQueue.length = 0;
    }
    if (this.#stderrOutputQueue.length) {
      this.#stderrOutputQueue.forEach((q) => q(this.#stderrOutput));
      this.#stderrOutputQueue.length = 0;
    }
  }

  kill(signo: DenoType.Signal) {
    throw new Error("Not implemented");
  }

  #toChild(msg: Parent2Child, transfer?: Transferable[]) {
    if (!transfer) this.#worker?.postMessage(msg);
    else this.#worker?.postMessage(msg, transfer);
  }
}
