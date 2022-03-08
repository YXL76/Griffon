import type * as child_process from "node:child_process";
import { EventEmitter } from "@griffon/libnode-events";

export abstract class BaseChildProcess
  extends EventEmitter
  implements Omit<child_process.ChildProcess, keyof EventEmitter>
{
  stdin = null;

  stdout = null;

  stderr = null;

  readonly channel = undefined;

  readonly stdio = [
    null,
    null,
    null,
    undefined,
    undefined,
  ] as child_process.ChildProcess["stdio"];

  killed = false;

  readonly pid?: number | undefined;

  readonly connected = true;

  readonly exitCode = null;

  readonly signalCode = null;

  readonly spawnargs = [];

  readonly spawnfile = "";

  send(
    message: child_process.Serializable,
    callback?: (error: Error | null) => void
  ): boolean;
  send(
    message: child_process.Serializable,
    sendHandle?: child_process.SendHandle,
    callback?: (error: Error | null) => void
  ): boolean;
  send(
    message: child_process.Serializable,
    sendHandle?: child_process.SendHandle,
    options?: child_process.MessageOptions,
    callback?: (error: Error | null) => void
  ): boolean;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(..._args: []): boolean {
    return false;
  }

  abstract kill(signal?: NodeJS.Signals | number): boolean;
  abstract disconnect(): void;
  abstract unref(): void;
  abstract ref(): void;
}
