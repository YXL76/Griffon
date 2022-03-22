/**
 * @see {@link https://man7.org/linux/man-pages/man7/signal.7.html signal}
 * Only Impl POSIX standard signals.
 */

export type TermSig =
  | "SIGALRM"
  | "SIGHUP"
  | "SIGINT"
  | "SIGKILL"
  | "SIGPIPE"
  | "SIGPROF"
  | "SIGTERM"
  | "SIGUSR1"
  | "SIGUSR2"
  | "SIGVTALRM";

export type IgnSig = "SIGCHLD" | "SIGURG";

export type CoreSig =
  | "SIGABRT"
  | "SIGBUS"
  | "SIGFPE"
  | "SIGILL"
  | "SIGQUIT"
  | "SIGSEGV"
  | "SIGSYS"
  | "SIGTRAP"
  | "SIGXCPU"
  | "SIGXFSZ";

export type StopSig = "SIGSTOP" | "SIGTSTP" | "SIGTTIN" | "SIGTTOU";

export type ContSig = "SIGCONT";

export type SignalNoCont = CoreSig | IgnSig | StopSig | TermSig;

export type Signal = ContSig | CoreSig | IgnSig | StopSig | TermSig;

// x86/ARM
export const SIGNALS: Record<Signal, number> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  SIGALRM: 14,
  SIGHUP: 1,
  SIGINT: 2,
  SIGKILL: 9,
  SIGPIPE: 13,
  SIGPROF: 24,
  SIGTERM: 15,
  SIGUSR1: 10,
  SIGUSR2: 12,
  SIGVTALRM: 26,
  SIGCHLD: 17,
  SIGURG: 23,
  SIGABRT: 6,
  SIGBUS: 7,
  SIGFPE: 8,
  SIGILL: 4,
  SIGQUIT: 3,
  SIGSEGV: 11,
  SIGSYS: 31,
  SIGTRAP: 5,
  SIGXCPU: 24,
  SIGXFSZ: 25,
  SIGSTOP: 19,
  SIGTSTP: 20,
  SIGTTIN: 21,
  SIGTTOU: 22,
  SIGCONT: 18,
  /* eslint-enable @typescript-eslint/naming-convention */
};
