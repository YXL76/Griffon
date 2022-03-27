// import { IDBFileSystem } from "@griffon/shared";

import { FileAccessFileSystem } from "./fileAccess";

export async function hackDenoFS() {
  const fileAccessFS = await FileAccessFileSystem.newDevice();

  // self.Deno.link = idbFS.link.bind(idbFS);
  self.Deno.open = fileAccessFS.open.bind(fileAccessFS);
  self.Deno.create = fileAccessFS.create.bind(fileAccessFS);
  // self.Deno.readSync = idbFS.readSync.bind(idbFS);
  self.Deno.read = fileAccessFS.read.bind(fileAccessFS);
  self.Deno.write = fileAccessFS.write.bind(fileAccessFS);
  self.Deno.seekSync = fileAccessFS.seekSync.bind(fileAccessFS);
  self.Deno.seek = fileAccessFS.seek.bind(fileAccessFS);
  self.Deno.fsyncSync = fileAccessFS.fsyncSync.bind(fileAccessFS);
  self.Deno.fsync = fileAccessFS.fsync.bind(fileAccessFS);
  self.Deno.fdatasyncSync = fileAccessFS.fdatasyncSync.bind(fileAccessFS);
  self.Deno.fdatasync = fileAccessFS.fdatasync.bind(fileAccessFS);
  self.Deno.mkdir = fileAccessFS.mkdir.bind(fileAccessFS);
  self.Deno.chmodSync = fileAccessFS.chmodSync.bind(fileAccessFS);
  self.Deno.chmod = fileAccessFS.chmod.bind(fileAccessFS);
  self.Deno.chownSync = fileAccessFS.chownSync.bind(fileAccessFS);
  self.Deno.chown = fileAccessFS.chown.bind(fileAccessFS);
  self.Deno.remove = fileAccessFS.remove.bind(fileAccessFS);
  self.Deno.rename = fileAccessFS.rename.bind(fileAccessFS);
  self.Deno.readTextFile = fileAccessFS.readTextFile.bind(fileAccessFS);
  self.Deno.readFile = fileAccessFS.readFile.bind(fileAccessFS);
  // self.Deno.realPath = idbFS.realPath.bind(idbFS);
  self.Deno.readDir = fileAccessFS.readDir.bind(fileAccessFS);
  self.Deno.copyFile = fileAccessFS.copyFile.bind(fileAccessFS);
  // self.Deno.readLink = idbFS.readLink.bind(idbFS);
  self.Deno.lstat = fileAccessFS.lstat.bind(fileAccessFS);
  self.Deno.stat = fileAccessFS.stat.bind(fileAccessFS);
  self.Deno.writeFile = fileAccessFS.writeFile.bind(fileAccessFS);
  self.Deno.writeTextFile = fileAccessFS.writeTextFile.bind(fileAccessFS);
  self.Deno.truncate = fileAccessFS.truncate.bind(fileAccessFS);
  // self.Deno.symlink = idbFS.symlink.bind(idbFS);
  self.Deno.ftruncate = fileAccessFS.ftruncate.bind(fileAccessFS);
  self.Deno.fstatSync = fileAccessFS.fstatSync.bind(fileAccessFS);
  self.Deno.fstat = fileAccessFS.fstat.bind(fileAccessFS);
}
