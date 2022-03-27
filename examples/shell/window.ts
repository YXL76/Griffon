import { boot } from "@griffon/window";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { require, hackDenoFS } = await boot();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const fsBtn = document.getElementById("fs-btn")! as HTMLButtonElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const runBtn = document.getElementById("run-btn")! as HTMLButtonElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const input = document.getElementById("code-input")! as HTMLTextAreaElement;

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
fsBtn.addEventListener("click", hackDenoFS);

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
