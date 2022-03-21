import { CONST } from "@griffon/shared";

class PTree {
  #maxPid = 0;

  get nextPid() {
    return (this.#maxPid += CONST.pidUnit);
  }
}

export const pTree = new PTree();
