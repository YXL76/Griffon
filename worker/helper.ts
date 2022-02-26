import type { Wkr2Win } from "@griffon/shared";

export function msg2Window(msg: Wkr2Win) {
  self.postMessage(msg);
}
