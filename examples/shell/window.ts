/// <reference types="wicg-file-system-access" />

import "./terminal";
import type {
  FileAccessStorageDevice,
  IndexedDBStorageDevice,
} from "@griffon/window";
import { boot } from "@griffon/window";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { require, rootfs } = await boot();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const faBtn = document.getElementById("fa-btn")! as HTMLButtonElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const idbBtn = document.getElementById("idb-btn")! as HTMLButtonElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const runBtn = document.getElementById("run-btn")! as HTMLButtonElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const input = document.getElementById("code-input")! as HTMLTextAreaElement;

faBtn.addEventListener("click", () => {
  showDirectoryPicker()
    .then((root) =>
      rootfs.newStorageDev<FileAccessStorageDevice>("fa", 1, root)
    )
    .catch(console.error);
});

idbBtn.addEventListener("click", () => {
  rootfs.newStorageDev<IndexedDBStorageDevice>("idb", 1).catch(console.error);
});

let lock = false;
runBtn.addEventListener("click", () => {
  if (lock) return;
  lock = true;

  const code = input.value;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function("require", `(async () => {${code}})();`)(require);
  console.log("Run finished:", code);

  lock = false;
});
