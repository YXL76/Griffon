import {
  FsFile,
  RESC_TABLE,
  notImplemented,
  pathFromURL,
} from "@griffon/deno-std";
import type { Parent2Child, UnionFileSystem } from ".";
import type {
  ReadOnlyResource,
  Resource,
  WriteOnlyResource,
} from "@griffon/deno-std";
import { ParentChildTp } from ".";
import { RingBuffer } from "./ringbuf";

export function parseCmd(
  fs: UnionFileSystem,
  [cmd, ...args]: string[] | [URL, ...string[]]
) {
  if (cmd != null) cmd = pathFromURL(cmd);
  else throw new Error("Assertion failed");

  if (cmd === "deno" || cmd === "/bin/deno") {
    const subCmd = args.shift();
    if (!subCmd) throw new Error("No subcommand");
    if (subCmd !== "run")
      throw new Error(`'${subCmd.toString()}' wasn't expected`);

    const file = args.shift();
    if (!file) throw new Error("No file");
    fs.statSync(file);

    return { type: ParentChildTp.deno as const, file, args: args as string[] };
  } else if (cmd === "node" || cmd === "/bin/node") {
    const file = args.shift();
    if (!file) throw new Error("No file");
    fs.statSync(file);

    return { type: ParentChildTp.node as const, file, args: args as string[] };
  } else notImplemented();
}

export function parseStdio(
  s: "inherit" | "piped" | "null" | number,
  p: "piped" | "null"
) {
  if (typeof s === "number") notImplemented();

  switch (s) {
    case "inherit":
      return p;
    case "piped":
    case "null":
      return s;
    default:
      throw new TypeError(`Bad stdio: ${s as string}`);
  }
}

export function stdioFile(
  stdin: "piped" | "null",
  stdout: "piped" | "null",
  stderr: "piped" | "null",
  postMessage: (msg: Parent2Child, transfer?: Transferable[]) => void
) {
  const ret = {} as { stdin: FsFile; stdout: FsFile; stderr: FsFile };
  {
    let node: Resource;
    if (stdin === "null") {
      node = new NullFile("childStdin");
      postMessage({ _t: ParentChildTp.stdin });
    } else if (stdin === "piped") {
      const { port1, port2 } = new MessageChannel();
      node = new StdioWriteOnlyFile("childStdin", port1);
      postMessage({ _t: ParentChildTp.stdin }, [port2]);
    } else {
      node = new NullFile("childStdin");
      postMessage({ _t: ParentChildTp.stdin });
    }

    const rid = RESC_TABLE.add(node);
    ret.stdin = new FsFile(rid);
  }
  {
    let node: Resource;
    if (stdout === "null") {
      node = new NullFile("childStdout");
      postMessage({ _t: ParentChildTp.stdout });
    } else if (stdout === "piped") {
      const { port1, port2 } = new MessageChannel();
      node = new StdioReadOnlyFile("childStdout", port1);
      postMessage({ _t: ParentChildTp.stdout }, [port2]);
    } else {
      node = new NullFile("childStdout");
      postMessage({ _t: ParentChildTp.stdout });
    }

    const rid = RESC_TABLE.add(node);
    ret.stdout = new FsFile(rid);
  }
  {
    let node: Resource;
    if (stderr === "null") {
      node = new NullFile("childStderr");
      postMessage({ _t: ParentChildTp.stderr });
    } else if (stderr === "piped") {
      const { port1, port2 } = new MessageChannel();
      node = new StdioReadOnlyFile("childStderr", port1);
      postMessage({ _t: ParentChildTp.stderr }, [port2]);
    } else {
      node = new NullFile("childStderr");
      postMessage({ _t: ParentChildTp.stderr });
    }

    const rid = RESC_TABLE.add(node);
    ret.stderr = new FsFile(rid);
  }

  return ret;
}

export class NullFile implements Resource {
  #name: string;

  readonly #mtime;

  readonly #birthtime = new Date();

  constructor(name: string) {
    this.#mtime = this.#birthtime;

    this.#name = name;
  }

  get name() {
    return this.#name;
  }

  close() {
    // noop
  }

  readSync() {
    return null;
  }

  read() {
    return Promise.resolve(null);
  }

  writeSync(buffer: Uint8Array) {
    return buffer.byteLength;
  }

  write(buffer: Uint8Array) {
    return Promise.resolve(buffer.byteLength);
  }

  syncSync() {
    // noop
  }

  async sync() {
    // noop
  }

  datasyncSync() {
    // noop
  }

  async datasync() {
    // noop
  }

  truncateSync() {
    // noop
  }

  async truncate() {
    // noop
  }

  seekSync() {
    return 0;
  }

  seek() {
    return Promise.resolve(0);
  }

  statSync() {
    return {
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      size: 0,
      nlink: null,
      ino: null,

      mtime: this.#mtime,
      birthtime: this.#birthtime,
    };
  }

  stat() {
    return Promise.resolve({
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      size: 0,
      nlink: null,
      ino: null,

      mtime: this.#mtime,
      birthtime: this.#birthtime,
    });
  }

  utimeSync() {
    // noop
  }

  async utime() {
    // noop
  }

  lockSync() {
    // noop
  }

  async lock() {
    // noop
  }

  unlockSync?() {
    // noop
  }

  async unlock() {
    // noop
  }
}

export class StdioWriteOnlyFile implements WriteOnlyResource {
  read: undefined;

  readSync: undefined;

  readonly #name: "childStdin" | "childStdout" | "childStderr";

  readonly #mtime;

  readonly #birthtime = new Date();

  #port: MessagePort;

  constructor(
    name: "childStdin" | "childStdout" | "childStderr",
    port: MessagePort
  ) {
    this.#mtime = this.#birthtime;

    this.#name = name;
    this.#port = port;
  }

  get name() {
    return this.#name;
  }

  close() {
    this.#port.close();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.#port = undefined;
  }

  writeSync(buffer: Uint8Array) {
    const len = buffer.byteLength;

    this.#port.postMessage(buffer, [buffer.buffer]);

    return len;
  }

  write(buffer: Uint8Array) {
    return Promise.resolve(this.writeSync(buffer));
  }

  statSync() {
    return {
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      size: 0,
      nlink: null,
      ino: null,

      mtime: this.#mtime,
      birthtime: this.#birthtime,
    };
  }

  stat() {
    return Promise.resolve(this.statSync());
  }
}

export class StdioReadOnlyFile implements ReadOnlyResource {
  write: undefined;

  writeSync: undefined;

  truncate: undefined;

  truncateSync: undefined;

  readonly #name: "childStdin" | "childStdout" | "childStderr";

  readonly #mtime;

  readonly #birthtime = new Date();

  readonly #port: MessagePort;

  readonly #buffer = new RingBuffer<Uint8Array>(32);

  constructor(
    name: "childStdin" | "childStdout" | "childStderr",
    port: MessagePort
  ) {
    this.#mtime = this.#birthtime;

    this.#name = name;
    this.#port = port;
    this.#port.onmessage = ({ data }: MessageEvent<Uint8Array>) => {
      if (!this.#buffer.full()) this.#buffer.push(data);
      else {
        const len = this.#length();
        const u8 = new Uint8Array(len + data.length);

        let offset = 0;
        let i = this.#buffer.shift();
        while (i) {
          u8.set(i, offset);
          offset += i.length;
          i = this.#buffer.shift();
        }
        u8.set(data, offset);

        this.#buffer.push(u8);
      }
    };
  }

  get name() {
    return this.#name;
  }

  close() {
    this.#port.close();
    this.#buffer.clear();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.#port = undefined;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.#buffer = undefined;
  }

  readSync(buffer: Uint8Array) {
    if (this.#buffer.empty()) return null;

    let offset = 0;
    let i = this.#buffer.shift();
    while (i && buffer.length >= offset + i.length) {
      buffer.set(i, offset);
      offset += i.length;
      i = this.#buffer.shift();
    }

    if (i) {
      const mid = buffer.length - offset;
      buffer.set(i.subarray(0, mid), offset);
      offset += mid;
      this.#buffer.unshift(i.subarray(mid));
    }

    return offset;
  }

  read(buffer: Uint8Array) {
    return Promise.resolve(this.readSync(buffer));
  }

  statSync() {
    const size = this.#length();

    return {
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      nlink: null,
      ino: null,

      size,
      mtime: this.#mtime,
      birthtime: this.#birthtime,
    };
  }

  stat() {
    return Promise.resolve(this.statSync());
  }

  #length() {
    let len = 0;
    for (const i of this.#buffer) len += i.length;
    return len;
  }
}
