import { Buffer } from "@griffon/libnode-globals";
import { fsMsg2Svc } from "./helper";

export class FileSystem {
  static readFile(
    path: string,
    options: { encoding?: null | undefined; flag?: string | undefined },
    callback: (err: Error | null, data: Buffer) => void
  ): void {
    fsMsg2Svc({ _fn: "readFile", args: [path, {}] })
      .then((data) => callback(null, Buffer.from(data)))
      .catch((err: Error) => callback(err, Buffer.from("")));
  }
}
