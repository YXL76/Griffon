import { Deno } from "@griffon/deno-std";
import type { DenoNamespace } from "@griffon/deno-std";
import type { Signal } from "@griffon/shared";

export type SigHandlers = () => void | Array<() => void>;

function noop() {
  // noop
}

export const defaultSigHdls: Record<Signal, SigHandlers> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  // TermSig
  SIGALRM: () => Deno.exit(14),
  SIGHUP: () => Deno.exit(1),
  SIGINT: () => Deno.exit(2),
  SIGKILL: () => Deno.exit(9),
  SIGPIPE: () => Deno.exit(13),
  SIGPROF: () => Deno.exit(24),
  SIGTERM: () => Deno.exit(15),
  SIGUSR1: () => Deno.exit(10),
  SIGUSR2: () => Deno.exit(12),
  SIGVTALRM: () => Deno.exit(26),

  // IgnSig
  SIGCHLD: noop,
  SIGURG: noop,

  // TermSig
  SIGABRT: () => Deno.exit(6),
  SIGBUS: () => Deno.exit(7),
  SIGFPE: () => Deno.exit(8),
  SIGILL: () => Deno.exit(4),
  SIGQUIT: () => Deno.exit(3),
  SIGSEGV: () => Deno.exit(11),
  SIGSYS: () => Deno.exit(31),
  SIGTRAP: () => Deno.exit(5),
  SIGXCPU: () => Deno.exit(24),
  SIGXFSZ: () => Deno.exit(25),

  // The main thread cannot be stopped or continued.
  // StopSig
  SIGSTOP: noop,
  SIGTSTP: noop,
  SIGTTIN: noop,
  SIGTTOU: noop,

  // ContSig
  SIGCONT: noop,
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
