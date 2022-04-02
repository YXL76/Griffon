import {
  CONST,
  ParentChildTp,
  WinWkrTp,
  fsSyncHandler,
  parseCmd,
  parseStdio,
  pid2Wid,
  stdioFile,
  textDecoder,
} from "@griffon/shared";
import type {
  Child2Parent,
  Parent2Child,
  StdioReadOnlyFile,
} from "@griffon/shared";
import type { ChildResource, DenoNamespace } from "@griffon/deno-std";
import { Deno, PCB, RESC_TABLE, readAllSyncSized } from "@griffon/deno-std";
import { defaultSigHdls } from "./signals";
import { msg2Win } from "./message";

export class Process<
  T extends DenoNamespace.RunOptions = DenoNamespace.RunOptions
> implements DenoNamespace.Process<T>, ChildResource
{
  #worker?: Worker;

  readonly #rid: number;

  readonly #wid: number;

  readonly #pid: number;

  #sig?: number;

  #code = 0;

  #output?: Uint8Array;

  #stderrOutput?: Uint8Array;

  readonly #statusQueue: ((value: DenoNamespace.ProcessStatus) => void)[] = [];

  readonly #outputQueue: ((value: Uint8Array) => void)[] = [];

  readonly #stderrOutputQueue: ((value: Uint8Array) => void)[] = [];

  readonly #sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);

  readonly stdin: DenoNamespace.Process<T>["stdin"] & { rid: number };

  readonly stdout: DenoNamespace.Process<T>["stdout"] & { rid: number };

  readonly stderr: DenoNamespace.Process<T>["stderr"] & { rid: number };

  constructor({
    cmd,
    cwd = PCB.cwd,
    clearEnv = false,
    env = {},
    // gid = undefined,
    stdout = "inherit",
    stderr = "inherit",
    stdin = "inherit",
    uid = PCB.uid,
  }: T & { clearEnv?: boolean; gid?: number; uid?: number }) {
    const { type, file, args } = parseCmd(self.ROOT_FS, cmd);

    if (!clearEnv) env = { ...Deno.env.toObject(), ...env };

    stdout = parseStdio(stdout, PCB.stdout);
    stderr = parseStdio(stderr, PCB.stderr);
    stdin = parseStdio(stdin, PCB.stdin);

    /**
     * @notice Chromium need some time(about 20ms) to set up the worker.
     * Therefore, all `postMessage` will be delayed until the worker is ready.
     */
    this.#worker = new Worker(CONST.workerURL, { type: "module" });
    this.#worker.onmessage = ({ data, ports }: MessageEvent<Child2Parent>) => {
      switch (data._t) {
        case ParentChildTp.exit:
          this.#code = data.code;
          this.#sig = data.sig;
          this.close();
          break;
        case ParentChildTp.fsSync:
          void fsSyncHandler(self.ROOT_FS, data, ports);
      }
    };
    this.#worker.onmessageerror = console.error;

    msg2Win({ _t: WinWkrTp.pid });
    if (Atomics.wait(self.WIN_SAB32, self.WID, 0) !== "ok")
      throw new Error("Failed to get pid.");
    this.#pid = Atomics.exchange(self.WIN_SAB32, self.WID, 0);
    this.#wid = pid2Wid(this.pid);

    // Make the child process can communicate with the main thread.
    const { port1, port2 } = new MessageChannel();
    msg2Win({ _t: WinWkrTp.proc, wid: this.#wid }, [port1]);
    this.#toChild(
      {
        _t: ParentChildTp.proc,
        pid: this.pid,
        ppid: Deno.pid,
        cwd,
        uid,
        env,
        wid: this.#wid,
        sab: this.#sab,
        winSab: self.WIN_SAB,

        args,
        stdout,
        stderr,
        stdin,
      },
      [port2]
    );

    const ret = stdioFile(stdin, stdout, stderr, this.#toChild.bind(this));
    this.stdin = ret.stdin;
    this.stdout = ret.stdout;
    this.stderr = ret.stderr;

    this.#rid = RESC_TABLE.add(this);

    self.ROOT_FS.readFile(file)
      .then((buf) => {
        const code = textDecoder.decode(buf);
        this.#toChild({ _t: type, code });
      })
      .catch((err) => {
        console.error(err);
        this.#code = 1;
        this.close();
      });
  }

  get name() {
    return "child" as const;
  }

  get rid() {
    return this.#rid;
  }

  get pid() {
    return this.#pid;
  }

  status(): Promise<DenoNamespace.ProcessStatus> {
    if (!this.#worker) return Promise.resolve(this.#runStatus());

    return new Promise((resolve) => this.#statusQueue.push(resolve));
  }

  output(): Promise<Uint8Array> {
    if (!this.stdout) {
      throw new TypeError("stdout was not piped");
    }

    if (!this.#worker) {
      if (!this.#output) throw new Error("Bad resource ID");

      const ret = this.#output;
      this.#output = undefined;
      return Promise.resolve(ret);
    }

    return new Promise((resolve) => this.#outputQueue.push(resolve));
  }

  stderrOutput(): Promise<Uint8Array> {
    if (!this.stderr) {
      throw new TypeError("stderr was not piped");
    }

    if (!this.#worker) {
      if (!this.#stderrOutput) throw new Error("Bad resource ID");

      const ret = this.#stderrOutput;
      this.#stderrOutput = undefined;
      return Promise.resolve(ret);
    }

    return new Promise((resolve) => this.#stderrOutputQueue.push(resolve));
  }

  close() {
    if (!this.#worker) return;

    // msg2Svc({ _t: WinSvcTp.exit, pid: this.pid });
    this.#worker.terminate();
    this.#worker = undefined;

    this.stdin.close();

    try {
      const stdout = <StdioReadOnlyFile>RESC_TABLE.getOrThrow(this.stdout.rid);
      const { size } = stdout.statSync();
      this.#output = readAllSyncSized(stdout, size);
    } finally {
      this.stdout.close();
    }
    this.#output ??= new Uint8Array(0);

    try {
      const stderr = <StdioReadOnlyFile>RESC_TABLE.getOrThrow(this.stderr.rid);
      const { size } = stderr.statSync();
      this.#stderrOutput = readAllSyncSized(stderr, size);
    } finally {
      this.stderr.close();
    }
    this.#stderrOutput ??= new Uint8Array(0);

    if (this.#statusQueue.length) {
      const status = this.#runStatus();
      this.#statusQueue.forEach((q) => q(status));
      this.#statusQueue.length = 0;
    }
    if (this.#outputQueue.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.#outputQueue.forEach((q) => q(this.#output!));
      this.#outputQueue.length = 0;

      this.#output = undefined;
    }
    if (this.#stderrOutputQueue.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.#stderrOutputQueue.forEach((q) => q(this.#stderrOutput!));
      this.#stderrOutputQueue.length = 0;

      this.#stderrOutput = undefined;
    }
  }

  kill(sig: DenoNamespace.Signal) {
    if (!Object.hasOwn(defaultSigHdls, sig))
      throw new TypeError(`Unknown signal: ${sig}`);

    if (sig === "SIGCONT") Atomics.notify(self.WIN_SAB32, this.#wid);
    else this.#toChild({ _t: ParentChildTp.kill, sig });
  }

  #runStatus(): DenoNamespace.ProcessStatus {
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
