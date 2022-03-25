export * from "./idb";

export function newFileInfo() {
  const birthtime = new Date();
  return {
    isFile: true,
    isDirectory: false,
    isSymlink: false,
    size: 0,
    mtime: birthtime,
    birthtime,
    nlink: 1,
  };
}

export function newDirInfo() {
  const birthtime = new Date();
  return {
    isFile: false,
    isDirectory: true,
    isSymlink: false,
    size: 0,
    mtime: birthtime,
    birthtime,
    nlink: 1,
  };
}
