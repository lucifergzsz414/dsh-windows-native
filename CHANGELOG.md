# Changelog

## 0.1.0

- Initial release: PowerShell syntax, console encoding, `.bat` ASCII constraint,
  junction/symlink failures, Office file locks, background-process cleanup notes.
- Tested end-to-end against `@deepseek-ai/dsh` `0.1.1-rc.2` — installed via a local
  `file:` dependency, confirmed in `dsh --dump-config`, and confirmed the injected
  text actually reaches a real chat response.
