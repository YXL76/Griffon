import { CONST, IDBFileSystem } from "@griffon/shared";

const idbFS = new IDBFileSystem(CONST.idbVersion);

export function hackDenoFS() {
  self.Deno.link = idbFS.link.bind(idbFS);
  self.Deno.open = idbFS.open.bind(idbFS);
  self.Deno.readSync = idbFS.readSync.bind(idbFS);
  self.Deno.read = idbFS.read.bind(idbFS);
  self.Deno.write = idbFS.write.bind(idbFS);
  self.Deno.seekSync = idbFS.seekSync.bind(idbFS);
  self.Deno.seek = idbFS.seek.bind(idbFS);
  self.Deno.mkdir = idbFS.mkdir.bind(idbFS);
}
