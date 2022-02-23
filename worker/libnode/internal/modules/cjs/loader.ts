/// <reference types="node/globals" />

import { NativeModule } from "../../bootstrap/loaders";
import path from "../../../path";

function updateChildren(
  parent: NodeJS.Module | null,
  child: NodeJS.Module,
  scan: boolean
) {
  const children = parent && parent.children;
  if (children && !(scan && children.includes(child))) children.push(child);
}

const builtinModules: string[] = [];
for (const [id, mod] of NativeModule.map) {
  if (mod.canBeRequiredByUsers) builtinModules.push(id);
}

Object.freeze(builtinModules);

export class Module implements NodeJS.Module {
  static readonly builtinModules = builtinModules;

  readonly children: NodeJS.Module[] = [];

  private readonly path: string;

  private readonly exports = {};

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private readonly filename = null;

  private readonly loaded = false;

  constructor(private readonly id: string, private readonly parent = null) {
    this.path = path.dirname(id);
    updateChildren(parent, this, false);
  }
}
