import { IDBFileSystem } from "@griffon/shared";

const idbFS = new IDBFileSystem();

export function hackDenoFS() {
  self.Deno.link = idbFS.link.bind(idbFS);
  self.Deno.open = idbFS.open.bind(idbFS);
  self.Deno.create = idbFS.create.bind(idbFS);
  self.Deno.readSync = idbFS.readSync.bind(idbFS);
  self.Deno.read = idbFS.read.bind(idbFS);
  self.Deno.write = idbFS.write.bind(idbFS);
  self.Deno.seekSync = idbFS.seekSync.bind(idbFS);
  self.Deno.seek = idbFS.seek.bind(idbFS);
  self.Deno.fsyncSync = idbFS.fsyncSync.bind(idbFS);
  self.Deno.fsync = idbFS.fsync.bind(idbFS);
  self.Deno.fdatasyncSync = idbFS.fdatasyncSync.bind(idbFS);
  self.Deno.fdatasync = idbFS.fdatasync.bind(idbFS);
  self.Deno.mkdir = idbFS.mkdir.bind(idbFS);
  self.Deno.chmodSync = idbFS.chmodSync.bind(idbFS);
  self.Deno.chmod = idbFS.chmod.bind(idbFS);
  self.Deno.chownSync = idbFS.chownSync.bind(idbFS);
  self.Deno.chown = idbFS.chown.bind(idbFS);
  self.Deno.remove = idbFS.remove.bind(idbFS);
  self.Deno.rename = idbFS.rename.bind(idbFS);
  self.Deno.readTextFile = idbFS.readTextFile.bind(idbFS);
  self.Deno.readFile = idbFS.readFile.bind(idbFS);
  self.Deno.realPath = idbFS.realPath.bind(idbFS);
  self.Deno.readDir = idbFS.readDir.bind(idbFS);
  self.Deno.copyFile = idbFS.copyFile.bind(idbFS);
  self.Deno.readLink = idbFS.readLink.bind(idbFS);
  self.Deno.lstat = idbFS.lstat.bind(idbFS);
  self.Deno.stat = idbFS.stat.bind(idbFS);
  self.Deno.writeFile = idbFS.writeFile.bind(idbFS);
  self.Deno.writeTextFile = idbFS.writeTextFile.bind(idbFS);
  self.Deno.truncate = idbFS.truncate.bind(idbFS);
  self.Deno.symlink = idbFS.symlink.bind(idbFS);
  self.Deno.ftruncate = idbFS.ftruncate.bind(idbFS);
  self.Deno.fstatSync = idbFS.fstatSync.bind(idbFS);
  self.Deno.fstat = idbFS.fstat.bind(idbFS);
}
