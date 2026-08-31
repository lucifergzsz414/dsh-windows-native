export const name = "dsh-windows-native";
export const inject = ["systemPrompt"];

const NOTES = [
  "You are running on native Windows (not WSL). The shell is PowerShell, not bash/cmd.",
  "",
  "Shell syntax:",
  "- PowerShell 5.1 has no `&&` / `||` chaining operators — they are a parse error.",
  "  Use `;` to run unconditionally, or `A; if ($?) { B }` to run B only if A succeeded.",
  "- Do not use bash-isms (heredocs, `export VAR=x cmd`, `[ -f x ]`). Use PowerShell",
  "  equivalents: here-strings (`@'...'@`), `$env:VAR = 'x'`, `Test-Path`.",
  "",
  "Encoding:",
  "- The console's default codepage is usually not UTF-8. Printing/reading Chinese or",
  "  other non-ASCII text through a script's stdout can come out as mojibake even when",
  "  the underlying data is correct. For Python: reconfigure stdout to utf-8 explicitly",
  "  (`sys.stdout.reconfigure(encoding='utf-8')`) rather than assuming the console matches.",
  "- Never pipe multi-line Chinese text through inline bash heredocs or `-c \"...\"` style",
  "  invocations — the shell can corrupt the encoding before the target program sees it.",
  "  Write the content to a file first, then run the file.",
  "- Python's `subprocess.run(..., text=True)` decodes the child's output using the",
  "  system locale, which on a Chinese Windows install is GBK, not UTF-8. A perfectly",
  "  successful subprocess can still raise `UnicodeDecodeError` if its own output",
  "  contains a character outside GBK (an em dash, for instance). Pass",
  "  `encoding=\"utf-8\", errors=\"replace\"` explicitly instead of relying on `text=True`.",
  "- `.bat` file contents must stay pure ASCII. cmd.exe pre-scans batch files and can",
  "  corrupt UTF-8 or GBK text even before execution; filenames may contain non-ASCII,",
  "  the script body should not.",
  "",
  "Filesystem:",
  "- Creating a symlink or NTFS junction can fail silently or be denied without admin",
  "  rights or Developer Mode enabled — don't assume a `mklink`/junction call succeeded",
  "  just because it returned; verify the link target exists afterward.",
  "- Path separators are backslashes; quote any path containing spaces.",
  "- Unix commands (`rm -rf`, `grep`, `find`) are not native — use `Remove-Item -Recurse",
  "  -Force`, `Select-String`, `Get-ChildItem -Recurse` or the project's dedicated tools.",
  "- A file open in Word/Excel/WPS raises a plain PermissionError on write, not corruption.",
  "  Don't force-overwrite or retry the same filename in a loop — save to a new filename or",
  "  tell the user to close the file first.",
  "",
  "Background processes:",
  "- Stopping the outer wrapper (a task runner, a job manager) does not free the port —",
  "  the real node/python process holding it can keep running, so the next check silently",
  "  hits the stale server and a real fix looks like it \"didn't work\". Find the actual PID",
  "  (the framework usually prints it, or `netstat -ano` / `Get-CimInstance Win32_Process`",
  "  by command line) and `Stop-Process -Id <PID> -Force` that exact process.",
  "- For a Scheduled Task that must run a script with no visible window, do not use",
  "  `powershell.exe -WindowStyle Hidden` — it still flashes a console window briefly.",
  "  Launch through `pythonw.exe` running `subprocess.Popen(..., creationflags=",
  "  subprocess.CREATE_NO_WINDOW)` instead.",
];

export function shouldInject(when, platform) {
  return when === "always" || platform === "win32";
}

export function buildText(extraNotes) {
  const extra = String(extraNotes ?? "").trim();
  let text = NOTES.join("\n");
  if (extra) {
    text += `\n\nAdditional operator notes:\n${extra}`;
  }
  return text;
}

export function apply(ctx, config = {}) {
  const when = config.when === "always" ? "always" : "windows";

  if (!shouldInject(when, process.platform)) {
    console.log("[dsh-windows-native] not running on native Windows; skipping prompt injection");
    return;
  }

  const order = Number.isFinite(config.order) ? config.order : 15;

  ctx.systemPrompt.section({
    name: "runtime:windows-native",
    order,
    text: buildText(config.extraNotes),
  });
}
