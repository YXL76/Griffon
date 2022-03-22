import { CONST, ParentChildTp, WinWkrTp, pid2Wid } from "@griffon/shared";
import type { Child2Parent, Parent2Child } from "@griffon/shared";
import type { DenoType } from "@griffon/deno-std";
import { defaultSigHdls } from "./signals";
import { fromFileUrl } from "@griffon/deno-std/deno_std/path/posix";
import { msg2Win } from "./message";

export class DenoProcess<T extends DenoType.RunOptions = DenoType.RunOptions>
  implements DenoType.Process<T>
{
  #worker?: Worker;

  /**
   * Resource ID.
   */
  #rid: number;

  #wid: number;

  #sig?: number;

  #code = 0;

  #output = new Uint8Array();

  #stderrOutput = new Uint8Array();

  readonly #statusQueue: ((value: DenoType.ProcessStatus) => void)[] = [];

  readonly #outputQueue: ((value: Uint8Array) => void)[] = [];

  readonly #stderrOutputQueue: ((value: Uint8Array) => void)[] = [];

  readonly #sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);

  readonly rid = NaN;

  readonly pid: number;

  readonly stdin = null as DenoType.Process<T>["stdin"];

  readonly stdout = null as DenoType.Process<T>["stdout"];

  readonly stderr = null as DenoType.Process<T>["stderr"];

  constructor({
    cmd,
    cwd = self.Deno._cwd_,
    clearEnv = false,
    env = {},
    // gid = undefined,
    // stdout = "inherit",
    // stderr = "inherit",
    // stdin = "inherit",
    uid = self.Deno._uid_,
  }: T & { clearEnv?: boolean; gid?: number; uid?: number }) {
    if (cmd[0] != null) cmd[0] = fromFileUrl(cmd[0]);

    if (cmd[0] !== "deno" && cmd[0] !== "node")
      throw new Error("Invalid command");

    if (!clearEnv) env = { ...self.Deno.env.toObject(), ...env };

    /**
     * @notice Chromium need some time(about 20ms) to set up the worker.
     * Therefore, all `postMessage` will be delayed until the worker is ready.
     */
    this.#worker = new Worker(CONST.workerURL, { type: "module" });
    this.#worker.onmessage = ({ data }: MessageEvent<Child2Parent>) => {
      switch (data._t) {
        case ParentChildTp.exit:
          this.#code = data.code;
          this.#sig = data.sig;
          this.close();
          break;
      }
    };
    this.#worker.onmessageerror = console.error;

    msg2Win({ _t: WinWkrTp.pid });
    if (Atomics.wait(self.WIN_SAB32, self.WID, 0) !== "ok")
      throw new Error("Failed to get pid.");
    this.pid = Atomics.exchange(self.WIN_SAB32, self.WID, 0);
    this.#wid = pid2Wid(this.pid);

    // Make the child process can communicate with the main thread.
    const { port1, port2 } = new MessageChannel();
    msg2Win({ _t: WinWkrTp.proc, wid: this.#wid }, [port1]);
    this.#toChild(
      {
        _t: ParentChildTp.proc,
        pid: this.pid,
        ppid: self.Deno.pid,
        cwd,
        uid,
        env,
        wid: this.#wid,
        sab: this.#sab,
        winSab: self.WIN_SAB,
      },
      [port2]
    );

    this.#rid = self.Deno._resTable_.add(this);

    if (self.WID <= 5) {
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
);`,
      });
    }
  }

  status(): Promise<DenoType.ProcessStatus> {
    if (!this.#worker) return Promise.resolve(this.#runStatus());

    return new Promise((resolve) => this.#statusQueue.push(resolve));
  }

  output(): Promise<Uint8Array> {
    if (!this.stdout) {
      throw new TypeError("stdout was not piped");
    }

    if (!this.#worker) return Promise.resolve(this.#output);

    return new Promise((resolve) => this.#outputQueue.push(resolve));
  }

  stderrOutput(): Promise<Uint8Array> {
    if (!this.stderr) {
      throw new TypeError("stderr was not piped");
    }

    if (!this.#worker) return Promise.resolve(this.#stderrOutput);

    return new Promise((resolve) => this.#stderrOutputQueue.push(resolve));
  }

  close() {
    if (!this.#worker) return;

    // msg2Svc({ _t: WkrSvcTp.exit, pid: this.pid });
    this.#worker.terminate();
    this.#worker = undefined;

    if (this.#statusQueue.length) {
      const status = this.#runStatus();
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

    if (sig === "SIGCONT") Atomics.notify(self.WIN_SAB32, this.#wid);
    else this.#toChild({ _t: ParentChildTp.kill, sig });
  }

  #runStatus(): DenoType.ProcessStatus {
    const signal = this.#sig;
    if (signal) return { success: false, code: 128 + signal, signal };
    if (this.#code === 0) return { success: true, code: 0 };
    return { success: false, code: this.#code };
  }

  #toChild(msg: Parent2Child, transfer?: Transferable[]) {
    if (!transfer) this.#worker?.postMessage(msg);
    else this.#worker?.postMessage(msg, transfer);
  }
}
