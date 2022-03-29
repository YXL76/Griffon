import "./terminal";
import type {
  FileAccessStorageDevice,
  IndexedDBStorageDevice,
} from "@griffon/window";
import { boot } from "@griffon/window";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { require, rootFS } = await boot();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const faBtn = document.getElementById("fa-btn")! as HTMLButtonElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const idbBtn = document.getElementById("idb-btn")! as HTMLButtonElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const runBtn = document.getElementById("run-btn")! as HTMLButtonElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const input = document.getElementById("code-input")! as HTMLTextAreaElement;

faBtn.addEventListener("click", () => {
  rootFS.newStorageDev<FileAccessStorageDevice>("fa").catch(console.error);
});

idbBtn.addEventListener("click", () => {
  rootFS.newStorageDev<IndexedDBStorageDevice>("idb").catch(console.error);
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
