import { expect, it } from "vite-plus/test";

import {
  codeLanguageEntry,
  codeLanguageLabel,
  languageOfInfoString,
} from "./composer-code-languages";

it("recognizes plain-text fence info strings without treating metadata as the language", () => {
  const entries = ["Text", "TEXT", "plaintext", "txt"].map((language) =>
    codeLanguageEntry(languageOfInfoString(` ${language} title=notes.txt`)),
  );

  expect(entries).toEqual(Array.from({ length: 4 }, () => ({ id: "", label: "Plain text" })));
  expect(codeLanguageLabel("txt")).toBe("일반 텍스트");
});

it("resolves hardware description language fences to their picker entries", () => {
  expect(
    ["verilog", "sv", "System-Verilog", "vhdl"].map((language) => codeLanguageEntry(language)?.id),
  ).toEqual(["verilog", "systemverilog", "systemverilog", "vhdl"]);
});
