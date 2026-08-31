# Contributing

If you hit something this plugin should have warned you about, open a PR that adds a
line to the `NOTES` array in `index.js`, grouped under the right heading (Shell syntax,
Encoding, Filesystem, Background processes — add a new heading if none fit).

What I'll actually merge:

- **A real failure you hit**, described concretely — the command, the error, what fixed
  it. Not "PowerShell can also do X" as a general tip.
- A matching test in `test/index.test.js` — `buildText()` already gets asserted against
  for a few keywords, add yours the same way.
- `npm test` passing.

What I won't:

- General Windows trivia that isn't specifically about running an AI coding agent here.
- Anything you're not sure actually happened — a guess reads exactly like a fact once
  it's in a system prompt, and the agent will act on it either way.
