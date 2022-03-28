export * from "./fileAccess";
export * from "./indexedDB";
export * from "./union";

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

export function newSymlinkInfo() {
  const birthtime = new Date();
  return {
    isFile: false,
    isDirectory: false,
    isSymlink: true,
    size: 0,
    mtime: birthtime,
    birthtime,
    nlink: 1,
  };
}
