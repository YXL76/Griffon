import type * as child_process from "node:child_process";
import {
  injectModule,
  normalizeSpawnArguments,
} from "@griffon/libnode-globals";
import { ChildProcess } from "./process";

function spawn(
  file: string,
  args?: string[] | child_process.SpawnOptions | void,
  options?: child_process.SpawnOptions | void
) {
  options = normalizeSpawnArguments(file, args, options);
  // validateTimeout(options.timeout);
  // validateAbortSignal(options.signal, "options.signal");
  // const killSignal = sanitizeKillSignal(options.killSignal);
  const child = new ChildProcess();

  child.spawn(options);

  if (options.timeout && options.timeout > 0) {
    let timeoutId: number | null = setTimeout(() => {
      if (timeoutId) {
        try {
          child.kill(/* killSignal */);
        } catch (err) {
          child.emit("error", err);
        }
        timeoutId = null;
      }
    }, options.timeout);

    child.once("exit", () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    });
  }

  /* if (options.signal) {
    const signal = options.signal;
    if (signal.aborted) {
      process.nextTick(onAbortListener);
    } else {
      signal.addEventListener("abort", onAbortListener, { once: true });
      child.once("exit", () =>
        signal.removeEventListener("abort", onAbortListener)
      );
    }

    function onAbortListener() {
      abortChildProcess(child, killSignal);
    }
  } */

  return child;
}

export function injectModules() {
  injectModule("child_process", {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ChildProcess,
  });
}
