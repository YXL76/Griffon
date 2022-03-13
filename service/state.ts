export interface ProcessTree {
  [key: number]: Record<number, never>;
}
export interface NestedProcessTree {
  [key: number]: ProcessTree | NestedProcessTree;
}

class PTree {
  #maxPid = 0;

  #maxUid = 0;

  #tree: NestedProcessTree = {};

  /**
   * Key is pid, value is parent tree.
   */
  #cache = new Map<number, NestedProcessTree>();

  get pid() {
    return ++this.#maxPid;
  }

  get uid() {
    return ++this.#maxUid;
  }

  get(pid: number): NestedProcessTree | undefined {
    return this.#cache.get(pid)?.[pid];
  }

  set(pid: number, ppid?: number) {
    if (ppid) {
      const caced = this.get(ppid);
      if (caced) {
        caced[pid] = {};
        this.#cache.set(pid, caced);
      }
    } else {
      this.#tree[pid] = {};
      this.#cache.set(pid, this.#tree);
    }
  }

  del(pid: number) {
    const caced = this.#cache.get(pid);
    if (caced) delete caced[pid];
  }
}

export const pTree = new PTree();
