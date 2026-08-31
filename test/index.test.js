import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldInject, buildText, apply, name, inject } from "../index.js";

describe("shouldInject", () => {
  it("injects on native win32", () => {
    assert.equal(shouldInject("windows", "win32"), true);
  });

  it("skips on linux (covers WSL, since WSL's Node reports linux not win32)", () => {
    assert.equal(shouldInject("windows", "linux"), false);
  });

  it("skips on darwin", () => {
    assert.equal(shouldInject("windows", "darwin"), false);
  });

  it("always injects when when=always regardless of platform", () => {
    assert.equal(shouldInject("always", "linux"), true);
    assert.equal(shouldInject("always", "darwin"), true);
  });
});

describe("buildText", () => {
  it("includes the core PowerShell/encoding/junction guidance", () => {
    const text = buildText();
    assert.match(text, /&&/);
    assert.match(text, /UTF-8/);
    assert.match(text, /junction/i);
    assert.match(text, /\.bat/);
  });

  it("includes the office-file-lock and background-process guidance", () => {
    const text = buildText();
    assert.match(text, /PermissionError/);
    assert.match(text, /Stop-Process/);
    assert.match(text, /CREATE_NO_WINDOW/);
  });

  it("includes the subprocess.run(text=True) GBK-decode footgun", () => {
    const text = buildText();
    assert.match(text, /subprocess\.run/);
    assert.match(text, /GBK/);
    assert.match(text, /errors="replace"/);
  });

  it("includes the docker bind-mount drive-letter-colon footgun", () => {
    const text = buildText();
    assert.match(text, /docker run/);
    assert.match(text, /silently fails/);
  });

  it("includes the cross-platform native-module footgun", () => {
    const text = buildText();
    assert.match(text, /PE32\+/);
    assert.match(text, /\.node files/);
  });

  it("includes the Set-Content/Add-Content ANSI-codepage footgun", () => {
    const text = buildText();
    assert.match(text, /Set-Content/);
    assert.match(text, /ANSI codepage/);
  });

  it("includes the nested-SSH-quoting hang footgun", () => {
    const text = buildText();
    assert.match(text, /silently hang/);
    assert.match(text, /scp/);
  });

  it("appends extraNotes when provided", () => {
    const text = buildText("custom note here");
    assert.match(text, /Additional operator notes:\ncustom note here/);
  });

  it("does not append an empty extraNotes section", () => {
    const text = buildText("   ");
    assert.doesNotMatch(text, /Additional operator notes/);
  });
});

describe("apply", () => {
  it("calls ctx.systemPrompt.section on native windows", () => {
    const calls = [];
    const ctx = { systemPrompt: { section: (s) => calls.push(s) } };
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
      apply(ctx, { when: "windows", order: 7 });
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, "runtime:windows-native");
    assert.equal(calls[0].order, 7);
    assert.match(calls[0].text, /PowerShell/);
  });

  it("does not call ctx.systemPrompt.section on linux when when=windows", () => {
    const calls = [];
    const ctx = { systemPrompt: { section: (s) => calls.push(s) } };
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });
    try {
      apply(ctx, { when: "windows" });
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
    assert.equal(calls.length, 0);
  });
});

describe("plugin metadata", () => {
  it("exports name and inject slots", () => {
    assert.equal(name, "dsh-windows-native");
    assert.deepEqual(inject, ["systemPrompt"]);
  });
});
