import "xterm/css/xterm.css";
import { Terminal } from "xterm";

const windowsMode =
  ["Windows", "Win16", "Win32", "WinCE"].indexOf(
    (navigator as unknown as { userAgentData: { platform: string } })
      .userAgentData.platform
  ) >= 0;
const term = new Terminal({
  cols: 160,
  cursorBlink: true,
  rows: 40,
  windowsMode,
});
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
term.open(document.getElementById("terminal")!);
term.focus();
term.write("Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ");
term.onData((data) => term.write(data));
