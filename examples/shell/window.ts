/// <reference types="wicg-file-system-access" />

import "xterm/css/xterm.css";
import type {
  FileAccessStorageDevice,
  IndexedDBStorageDevice,
} from "@griffon/window";
import type Shelljs from "shelljs";
import { Terminal } from "xterm";
import { boot } from "@griffon/window";

const windowsMode =
  ["Windows", "Win16", "Win32", "WinCE"].indexOf(
    (navigator as unknown as { userAgentData: { platform: string } })
      .userAgentData.platform
  ) >= 0;
const term = new Terminal({
  cols: 150,
  cursorBlink: true,
  rows: 40,
  windowsMode,
});

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
term.open(document.getElementById("terminal")!);
term.writeln("Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ");
term.focus();

const { require, rootfs } = await new Promise<Awaited<ReturnType<typeof boot>>>(
  (resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document
      .getElementById("boot-btn")!
      .addEventListener(
        "click",
        () => void boot().then(resolve).catch(console.error),
        { once: true }
      );
  }
);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const faInput = document.getElementById("fa-input")! as HTMLInputElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const idbInput = document.getElementById("idb-input")! as HTMLInputElement;

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
document.getElementById("fa-btn")!.addEventListener("click", () => {
  const id = parseInt(faInput.value);
  if (Number.isNaN(id) || id < 0) throw new Error("invalid id");
  showDirectoryPicker()
    .then((root) =>
      rootfs.newStorageDev<FileAccessStorageDevice>("fa", id, root)
    )
    .catch(console.error);
});

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
document.getElementById("idb-btn")!.addEventListener("click", () => {
  const id = parseInt(idbInput.value);
  if (Number.isNaN(id) || id < 0) throw new Error("invalid id");
  rootfs
    .newStorageDev<IndexedDBStorageDevice>("idb", id, `fs${id}`)
    .catch(console.error);
});

declare const SHELLJS_CODE_BYTES: string;
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const Deno: { cwd(): string };

const head = () => `${Deno.cwd()}> `;

// eslint-disable-next-line prefer-const
let module = {} as { exports: { default: typeof Shelljs } };
// eslint-disable-next-line @typescript-eslint/no-implied-eval
new Function("require", "module", SHELLJS_CODE_BYTES)(require, module);

let hispos = 1;
const history: string[] = [];

let linelock = false;
let pos = 0;
let line = "";
term.onData((data) => {
  switch (data) {
    case "\x04" /** Ctrl+D */:
      term.writeln("^D");
      break;
    case "\t" /** Tab */:
      break;
    case "\r" /** Enter */: {
      term.writeln("");
      const l = line;
      line = "";
      newline(l);
      break;
    }
    case "\x7F" /** Backspace */:
      if (line) {
        term.write("\b \b");
        line = line.slice(0, -1);
      }
      break;
    case "\x1B\x5B\x41" /** Up */:
      if (!linelock && hispos > 0) {
        --hispos;
        term.write(`\x1b[G\x1b[K${head()}${history[hispos]}`);
      }
      break;
    case "\x1B\x5B\x42" /** Down */:
      if (!linelock && hispos <= history.length - 1) {
        ++hispos;
        hispos === history.length
          ? term.write(`\x1b[G\x1b[K${head()}`)
          : term.write(`\x1b[G\x1b[K${head()}${history[hispos]}`);
      }
      break;
    case "\x1B\x5B\x43" /** Right */:
      if (pos < line.length) {
        ++pos;
        term.write(data);
      }
      break;
    case "\x1B\x5B\x44" /** Left */:
      if (pos > 0) {
        --pos;
        term.write(data);
      }
      break;
    case "\x01":
    case "\x02":
    case "\x03":
    case "\x05":
    case "\x06":
    case "\x07":
    case "\x08":
    case "\x0B":
    case "\x0C":
    case "\x0E":
    case "\x0F":
    case "\x10":
    case "\x11":
    case "\x12":
    case "\x13":
    case "\x14":
    case "\x15":
    case "\x16":
    case "\x17":
    case "\x18":
    case "\x19":
    case "\x1A":
    case "\x1C":
    case "\x1D":
    case "\x1E":
    case "\x1F":
      break;
    default:
      term.write(data);
      line += data;
  }
});

term.write(head());

const commands = [
  "cat",
  "cd",
  "chmod",
  "cp",
  "dirs",
  "echo",
  "exec",
  "find",
  "grep",
  "head",
  "ln",
  "ls",
  "mkdir",
  "mv",
  "pwd",
  "rm",
  "sed",
  "set",
  "sort",
  "tail",
  "tempdir",
  "test",
  "touch",
  "uniq",
  "which",

  // Custom
  "clear",
  "mount",
  "unmount",
] as const;

type ExtractArray<A> = A extends ReadonlyArray<infer R> ? R : never;
type Keys = Exclude<
  ExtractArray<typeof commands>,
  "clear" | "mount" | "unmount"
>;

function newline(line: string) {
  linelock = true;

  const args = line.split(" ").filter((s) => s);
  const command = args.shift();

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!command || !commands.includes(command as Keys)) {
      term.writeln("Unknown command");
    } else if (command === "clear") {
      if (args.length) throw new Error("invalid option");
      else term.clear();
    } else if (command === "mount") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      void rootfs.mount(...args);
    } else if (command === "unmount") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      void rootfs.unmount(...args);
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const ret = module.exports.default[command as Keys](...args);

      const stdout = (Array.isArray(ret) && ret.join(" ")) || ret?.toString();
      if (stdout) term.writeln(stdout);
      if (typeof ret === "object" && ret?.stderr) term.writeln(ret.stderr);

      history.push(line);
    }
  } catch (err) {
    if (err instanceof Error) term.writeln(err.toString());
    else if (typeof err === "string") term.writeln(err);
    else console.error(err);
  }

  term.write(head());
  hispos = history.length;
  pos = 0;

  linelock = false;
}
