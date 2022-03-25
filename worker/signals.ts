import type { DenoNamespace } from "@griffon/deno-std";
import { ParentChildTp } from "@griffon/shared";
import type { Signal } from "@griffon/shared";
import { msg2Parent } from "./message";

export type SigHandlers = () => void | Array<() => void>;

function noop() {
  // noop
}

function term(sig: number) {
  msg2Parent({ _t: ParentChildTp.exit, code: sig, sig });
  return self.close() as never;
}

function stop() {
  if (Atomics.wait(self.WIN_SAB32, self.WID, 0) !== "ok")
    throw new Error("Failed to stop.");
}

export const defaultSigHdls: Record<Signal, SigHandlers> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  // TermSig
  SIGALRM: () => term(14),
  SIGHUP: () => term(1),
  SIGINT: () => term(2),
  SIGKILL: () => term(9),
  SIGPIPE: () => term(13),
  SIGPROF: () => term(24),
  SIGTERM: () => term(15),
  SIGUSR1: () => term(10),
  SIGUSR2: () => term(12),
  SIGVTALRM: () => term(26),

  // IgnSig
  SIGCHLD: noop,
  SIGURG: noop,

  // TermSig
  SIGABRT: () => term(6),
  SIGBUS: () => term(7),
  SIGFPE: () => term(8),
  SIGILL: () => term(4),
  SIGQUIT: () => term(3),
  SIGSEGV: () => term(11),
  SIGSYS: () => term(31),
  SIGTRAP: () => term(5),
  SIGXCPU: () => term(24),
  SIGXFSZ: () => term(25),

  // The main thread cannot be stopped or continued.
  // StopSig
  SIGSTOP: stop,
  SIGTSTP: stop,
  SIGTTIN: stop,
  SIGTTOU: stop,

  // ContSig
  SIGCONT: noop, // Action is taken on the main thread.
  /* eslint-enable @typescript-eslint/naming-convention */
};

Object.freeze(defaultSigHdls);

const sigHdls: Record<Signal, SigHandlers> = { ...defaultSigHdls };

export function dispatchSignalEvent(signal: Signal) {
  const hdls = sigHdls[signal];
  if (hdls) {
    if (Array.isArray<Array<() => void>>(hdls)) hdls.forEach((h) => h());
    else hdls();
  }
}

export function addSignalListener(
  signal: DenoNamespace.Signal,
  handler: () => void
) {
  if (!Object.hasOwn(sigHdls, signal))
    throw new Error(`Invalid signal: ${signal}`);

  const hdls = sigHdls[signal];
  if (Array.isArray(hdls)) hdls.push(handler);
  else sigHdls[signal] = [handler] as unknown as SigHandlers;
}

export function removeSignalListener(
  signal: DenoNamespace.Signal,
  handler: () => void
) {
  if (!Object.hasOwn(sigHdls, signal))
    throw new Error(`Invalid signal: ${signal}`);

  const hdls = sigHdls[signal];
  if (Array.isArray(hdls)) {
    const idx = hdls.findIndex(handler);
    if (idx === -1) return;

    if (hdls.length === 1) sigHdls[signal] = defaultSigHdls[signal];
    else hdls.splice(idx, 1);
  }
}
