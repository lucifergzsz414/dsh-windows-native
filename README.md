# dsh-windows-native

I run [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) straight on
Windows — no WSL, just PowerShell. Every WSL & Windows Interop plugin on the
[dsh-plugin list](https://github.com/topics/dsh-plugin) assumes you're bridging out
*from* WSL, so none of them help here. Meanwhile the agent kept doing the same handful
of things wrong: chaining commands with `&&` (PowerShell 5.1 doesn't have it), printing
Chinese text that comes back as mojibake, quietly creating a junction that Windows then
refuses and nobody notices. This plugin just tells it up front so it stops guessing.

It's a system-prompt injection, nothing fancier. Copy-pasted the structure from
[dsh-wsl-env](https://github.com/173787247/dsh-wsl-env) since that plugin already
does the WSL side of the same idea well.

## What it tells the agent

- PowerShell has no `&&` / `||` — use `;`, or `A; if ($?) { B }`
- The console usually isn't UTF-8, so Chinese/non-ASCII output can get mangled even
  though the actual data is fine — don't trust what you see printed
- Don't feed multi-line non-ASCII text through an inline heredoc or `-c "..."` — write
  it to a file first, then run the file
- Python's `subprocess.run(..., text=True)` decodes child output using the system
  locale — GBK on a Chinese Windows install, not UTF-8. A subprocess that ran fine can
  still blow up with `UnicodeDecodeError` on its own output. Pass `encoding="utf-8",
  errors="replace"` explicitly
- `.bat` file *contents* have to stay ASCII (cmd.exe pre-scans them and can corrupt
  UTF-8/GBK before anything runs — filenames are fine, the script body isn't)
- A junction or symlink can fail silently without admin rights / Developer Mode — check
  it actually exists after creating it, don't just trust the exit code
- A file open in Word/Excel/WPS throws a plain PermissionError on write. That's not
  corruption, don't force-retry the same filename
- `docker run -v "C:\path\file.yaml:/container/path:ro"` can get mis-split — the drive
  letter's colon looks like another separator. The mount silently fails, the container
  still reports healthy, and it just runs on defaults. `docker exec` in and check the
  file before blaming the application code
- Killing the outer process (a task runner, a job wrapper) doesn't free the port if the
  real node/python process underneath is still alive — you end up hitting a stale
  server and think your fix didn't work. Find the real PID and kill that
- If you need a Scheduled Task to run something invisibly, `-WindowStyle Hidden` still
  flashes a console window for a moment. Launch it through `pythonw.exe` with
  `CREATE_NO_WINDOW` instead

None of this is theoretical — every line above is something that actually went wrong
on this machine at some point.

## Install

```sh
dsh plugin add dsh-windows-native
```

## Config

```yaml
when: windows   # inject only on native win32 (default), or "always"
order: 15
extraNotes: ""   # your own notes, appended after the built-in list
```

## Status

Early, and the list is exactly as long as my own scar tissue — not a survey of every
Windows footgun that exists. If you hit something this plugin should have warned you
about, open a PR with the actual failure you saw, not a guess at what might go wrong.

Tested against `@deepseek-ai/dsh` `0.1.1-rc.2` — installed it locally as a `file:`
dependency, checked `dsh --dump-config` to confirm it's picked up, then actually asked
the running agent a question and watched the injected text come back in its answer.
