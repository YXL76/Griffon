import { CONST, ParentChildTp, WinSvcChanTp, WinSvcTp } from "@griffon/shared";
import { Channel, msg2Svc } from "./message";
import type { Child2Parent, Parent2Child } from "@griffon/shared";
import type { DenoType } from "@griffon/deno-std";

export class DenoProcess implements DenoType.Process {
  #worker?: Worker;

  #code = 0;

  #output = new Uint8Array();

  #stderrOutput = new Uint8Array();

  readonly #statusQueue: ((value: DenoType.ProcessStatus) => void)[] = [];

  readonly #outputQueue: ((value: Uint8Array) => void)[] = [];

  readonly #stderrOutputQueue: ((value: Uint8Array) => void)[] = [];

  readonly rid = NaN;

  pid = NaN;

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
    const cwd = opt.cwd ?? self.Deno._cwd_;
    const uid = opt.uid ?? self.Deno._uid_;
    const ppid = self.Deno.pid;

    const wkrSvc = new MessageChannel();

    Channel.svc({ _t: WinSvcChanTp.proc, ppid }, [wkrSvc.port1])
      .then(({ pid }) => {
        this.pid = pid;
        this.#worker = new Worker(CONST.workerURL, { type: "module" });
        this.#worker.onmessage = ({ data }: MessageEvent<Child2Parent>) => {
          switch (data._t) {
            case ParentChildTp.exit:
              this.#code = data.code;
              this.close();
              break;
          }
        };

        this.#toChild({ _t: ParentChildTp.proc, pid, ppid, cwd, uid }, [
          wkrSvc.port2,
        ]);
      })
      .catch(() => {
        //
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

  #toChild(msg: Parent2Child, transfer: Transferable[]) {
    if (!transfer) this.#worker?.postMessage(msg);
    else this.#worker?.postMessage(msg, transfer);
  }
}
