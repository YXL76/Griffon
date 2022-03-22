import { CONST, ParentChildTp, WinSvcTp, pid2Wid } from "@griffon/shared";
import type { Child2Parent, Parent2Child, Win2Wkr } from "@griffon/shared";
import { msg2Svc, wkrHandler } from "./message";
import type { DenoType } from "@griffon/deno-std";
import { defaultSigHdls } from "./signals";

export interface ProcessTree {
  children: Record<number, ProcessTree>;
  parent?: number;
  port: MessagePort;
}

class ProcTree {
  #maxPid?: number;

  #root: Record<number, ProcessTree> = {};

  /**
   * Key is pid, value is parent tree.
   */
  #cache = new Map<number, ProcessTree>();

  nextPid(port: MessagePort, parent?: number) {
    if (!this.#maxPid) this.#maxPid = self.Deno.pid;
    const pid = ++this.#maxPid;
    const thisObj = { children: {}, parent, port };
    this.#cache.set(pid, thisObj);
    if (parent) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const parentObj = this.#cache.get(parent)!;
      parentObj.children[pid] = thisObj;
    } else this.#root[pid] = thisObj;
    return pid;
  }

  postMessage(pid: number, data: Win2Wkr) {
    const proc = this.#cache.get(pid);
    proc?.port.postMessage(data);
  }
}

export const procTree = new ProcTree();

export class DenoProcess implements DenoType.Process {
  #worker?: Worker;

  #wid: number;

  #code = 0;

  #output = new Uint8Array();

  #stderrOutput = new Uint8Array();

  readonly #statusQueue: ((value: DenoType.ProcessStatus) => void)[] = [];

  readonly #outputQueue: ((value: Uint8Array) => void)[] = [];

  readonly #stderrOutputQueue: ((value: Uint8Array) => void)[] = [];

  readonly #sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);

  readonly rid = NaN;

  readonly pid: number;

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

    // Make the child process can communicate with the main thread.
    const { port1, port2 } = new MessageChannel();
    this.pid = procTree.nextPid(port1);
    this.#wid = pid2Wid(this.pid);
    port1.onmessage = wkrHandler.bind(port1, this.#wid);
    this.#toChild(
      {
        _t: ParentChildTp.proc,
        pid: this.pid,
        ppid: self.Deno.pid,
        cwd: opt.cwd ?? self.Deno._cwd_,
        uid: opt.uid ?? self.Deno._uid_,
        wid: this.#wid,
        sab: this.#sab,
        winSab: self.SAB,
      },
      [port2]
    );

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

  kill(sig: DenoType.Signal) {
    if (!Object.hasOwn(defaultSigHdls, sig))
      throw new TypeError(`Unknown signal: ${sig}`);

    if (sig === "SIGCONT") Atomics.notify(self.SAB32, this.#wid);
    else this.#toChild({ _t: ParentChildTp.kill, sig });
  }

  #toChild(msg: Parent2Child, transfer?: Transferable[]) {
    if (!transfer) this.#worker?.postMessage(msg);
    else this.#worker?.postMessage(msg, transfer);
  }
}
