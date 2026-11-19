import { expect, it } from "vite-plus/test";
import ts from "typescript-legacy";

import {
  collectLocale,
  collectSourceText,
  createNearMatcher,
  patternIsLive,
  regexFragments,
  templateProduces,
} from "./check-locale-keys.ts";

const parse = (source: string) =>
  ts.createSourceFile("x.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

it("collects literals, interpolation shapes, JSX text, and member names from sources", () => {
  const text = collectSourceText(
    parse(`
      const a = "Plain text";
      const b = \`\${name} is off. Turn it on.\`;
      const c = "Could not " + verb + " the file";
      const d = <p>  Hello
        world </p>;
      settingsText.someKey;
    `),
  );
  expect([...text.exact]).toEqual(expect.arrayContaining(["Plain text", "Hello world"]));
  expect(text.templates).toEqual(
    expect.arrayContaining([
      [null, " is off. Turn it on."],
      ["Could not ", null, " the file"],
    ]),
  );
  expect(text.members.has("someKey")).toBe(true);
  expect(text.dynamicLookups.size).toBe(0);
});

it("records only references and dynamic lookups in locale modules", () => {
  const text = collectSourceText(
    parse(`
      export const dict = { "Key text": "값" };
      export const f = (t: string) => dict[t] ?? other["Static"] ?? map.get(t);
      export const g = (t: string) => Object.hasOwn(table, t);
    `),
    undefined,
    { locale: true },
  );
  expect([...text.exact]).toEqual(["Static"]);
  expect([...text.dynamicLookups].toSorted()).toEqual(["dict", "map", "table"]);
});

it("reads dictionary keys, skips union-keyed private maps, and reads regex literals", () => {
  const { entries, patterns } = collectLocale(
    parse(`
      export const text = { "English key": "한국어", ident: "값", fn: (n: number) => \`\${n}\` } as const;
      const states: Record<State, string> = { working: "작업 중" };
      const reasons: Readonly<Record<string, string>> = { "no rules apply": "없음" };
      export function localize(value: string) {
        const fixed: Record<string, string> = { "Line": "줄" };
        return /^Remove (.+)\\?$/gi.exec(value);
      }
    `),
    "locale.ts",
  );
  expect(entries.map(({ dict, key, exported }) => [dict, key, exported])).toEqual([
    ["text", "English key", true],
    ["text", "ident", true],
    ["text", "fn", true],
    ["reasons", "no rules apply", false],
    ["fixed", "Line", false],
  ]);
  expect(patterns).toEqual([
    { file: "locale.ts", line: 7, source: "^Remove (.+)\\?$", flags: "gi" },
  ]);
});

it("splits regex sources into required and optional wording", () => {
  expect(
    regexFragments(String.raw`^(submodule )?has uncommitted changes \((\d+) files?\)$`),
  ).toEqual([
    { text: "submodule ", required: false },
    { text: "has uncommitted changes (", required: true },
    { text: " file", required: true },
  ]);
  expect(regexFragments(String.raw`^Pi default \((?<id>.+)\) has (?:no|some) models\.$`)).toEqual([
    { text: "Pi default (", required: true },
    { text: ") has ", required: true },
    { text: "some", required: false },
    { text: " models.", required: true },
  ]);
  expect(regexFragments("^(Sun|Mon|Tue)day$|^Weekly$").every((f) => !f.required)).toBe(true);
});

it("matches keys against interpolation shapes", () => {
  expect(templateProduces([null, " is off. Turn it on."], "Codex is off. Turn it on.")).toBe(true);
  expect(templateProduces(["Could not ", null, " the file"], "Could not open the file")).toBe(true);
  expect(templateProduces(["Could not ", null, " the file"], "Could not open the folder")).toBe(
    false,
  );
});

it("treats a regex as live when a sample matches or one file holds its required wording", () => {
  const pattern = { source: String.raw`^(.+) took too long to respond\.$`, flags: "" };
  const noFiles = { fileStatics: [] };
  expect(patternIsLive(pattern, noFiles, ["Model X took too long to respond."])).toBe(true);
  expect(patternIsLive(pattern, noFiles, ["Model X timed out."])).toBe(false);

  const composed = { source: String.raw`^Pi default \((.+)\) has no credentials\.$`, flags: "" };
  expect(
    patternIsLive(composed, { fileStatics: ["pi default (\n) has no credentials."] }, []),
  ).toBe(true);
  expect(patternIsLive(composed, { fileStatics: ["pi default (\n) lacks credentials."] }, [])).toBe(
    false,
  );

  const lowered = { source: String.raw`^shared by (\d+) threads$`, flags: "" };
  expect(patternIsLive(lowered, noFiles, ["Shared by 1 threads"])).toBe(true);
  expect(patternIsLive({ source: "^(On|Off)$", flags: "" }, noFiles, [])).toBe("unchecked");
});

it("suggests reworded source text only above the similarity threshold", () => {
  const closest = createNearMatcher([
    "Authenticate this server with `fj --host <server-url> auth add-token` first.",
    "Already up to date.",
  ]);
  expect(closest("Authenticate this server with `fj --host <server-url> auth add-token`.")).toMatch(
    /^Authenticate this server/,
  );
  expect(closest("Could not install update")).toBeUndefined();
  expect(closest("Two words")).toBeUndefined();
});
