import type { DenoType } from "@griffon/deno-std";
import type { Signal } from "@griffon/shared";

export type SigHandlers = () => void | Array<() => void>;

function noop() {
  // noop
}

export const defaultSigHdls: Record<Signal, SigHandlers> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  // TermSig
  SIGALRM: () => self.Deno.exit(14),
  SIGHUP: () => self.Deno.exit(1),
  SIGINT: () => self.Deno.exit(2),
  SIGKILL: () => self.Deno.exit(9),
  SIGPIPE: () => self.Deno.exit(13),
  SIGPROF: () => self.Deno.exit(24),
  SIGTERM: () => self.Deno.exit(15),
  SIGUSR1: () => self.Deno.exit(10),
  SIGUSR2: () => self.Deno.exit(12),
  SIGVTALRM: () => self.Deno.exit(26),

  // IgnSig
  SIGCHLD: noop,
  SIGURG: noop,

  // TermSig
  SIGABRT: () => self.Deno.exit(6),
  SIGBUS: () => self.Deno.exit(7),
  SIGFPE: () => self.Deno.exit(8),
  SIGILL: () => self.Deno.exit(4),
  SIGQUIT: () => self.Deno.exit(3),
  SIGSEGV: () => self.Deno.exit(11),
  SIGSYS: () => self.Deno.exit(31),
  SIGTRAP: () => self.Deno.exit(5),
  SIGXCPU: () => self.Deno.exit(24),
  SIGXFSZ: () => self.Deno.exit(25),

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

const sigHdls = { ...defaultSigHdls };

export function addSignalListener(
  signal: DenoType.Signal,
  handler: () => void
) {
  if (!Object.hasOwn(sigHdls, signal))
    throw new Error(`Invalid signal: ${signal}`);

  const handlers = sigHdls[signal];
  if (Array.isArray(handlers)) handlers.push(handler);
  else sigHdls[signal] = [handler] as unknown as SigHandlers;
}

export function removeSignalListener(
  signal: DenoType.Signal,
  handler: () => void
) {
  if (!Object.hasOwn(sigHdls, signal))
    throw new Error(`Invalid signal: ${signal}`);

  const handlers = sigHdls[signal];
  if (Array.isArray(handlers)) {
    const idx = handlers.findIndex(handler);
    if (idx === -1) return;

    if (handlers.length === 1) sigHdls[signal] = defaultSigHdls[signal];
    else handlers.splice(idx, 1);
  }
}
