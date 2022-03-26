import { boot } from "@griffon/window";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const require = await boot();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const runBtn = document.getElementById("run-btd")! as HTMLButtonElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const input = document.getElementById("code-input")! as HTMLTextAreaElement;

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
