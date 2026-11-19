// @effect-diagnostics nodeBuiltinImport:off globalConsole:off globalDate:off - standalone report over local sources.
// Reports Korean locale keys that nothing reaches, and English lookup keys or patterns for
// runtime text that no longer match any source literal (upstream wording changed or removed).
//
//   node scripts/check-locale-keys.ts [--strict] [--json]
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
// The legacy compiler API parses sources; TypeScript 7 no longer exports it.
import ts from "typescript-legacy";

const repoRoot = NodePath.resolve(import.meta.dirname, "..");
const localeRoots = ["apps/web/src/locales", "apps/desktop/src/locales"];
const sourceRoots = ["apps/server/src", "apps/web/src", "apps/desktop/src", "packages/*/src"];

// Runtime lookups whose input is intentionally not a source literal. Ids are
// `<dict>:<key>` for keys and `/<source>/<flags>` for patterns.
export const contractAllowlist: ReadonlyArray<{ readonly id: string; readonly reason: string }> = [
  {
    id: "providerOptionLabels:Bypass Permissions",
    reason: "session mode label reported at runtime by ACP agents",
  },
  {
    id: "providerOptionLabels:Auto-approve tools",
    reason: "option label reported at runtime by ACP agents",
  },
];

/** Static text with `null` where a runtime value is interpolated. */
export type TextPattern = ReadonlyArray<string | null>;

export interface SourceText {
  readonly exact: Set<string>;
  readonly templates: TextPattern[];
  readonly members: Set<string>;
  readonly dynamicLookups: Set<string>;
  /** Lowercased static text of each source file, for patterns assembled from several literals. */
  readonly fileStatics: string[];
}

export interface LocaleEntry {
  readonly file: string;
  readonly line: number;
  readonly dict: string;
  readonly key: string;
  readonly exported: boolean;
}

export interface LocalePattern {
  readonly file: string;
  readonly line: number;
  readonly source: string;
  readonly flags: string;
}

export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly id: string;
  /** Reached only through a runtime lookup such as `localizeSettingsText`. */
  readonly runtime?: boolean;
  /** Most similar current source text, when the wording looks changed. */
  readonly closest?: string;
}

const emptySourceText = (): SourceText => ({
  exact: new Set(),
  templates: [],
  members: new Set(),
  dynamicLookups: new Set(),
  fileStatics: [],
});

const isStringNode = (node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);

function patternOf(node: ts.Expression): TextPattern | undefined {
  if (isStringNode(node)) return [node.text];
  if (ts.isParenthesizedExpression(node)) return patternOf(node.expression);
  if (ts.isTemplateExpression(node))
    return [node.head.text, ...node.templateSpans.flatMap((span) => [null, span.literal.text])];
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = patternOf(node.left);
    const right = patternOf(node.right);
    if (!left && !right) return undefined;
    return [...(left ?? [null]), ...(right ?? [null])];
  }
  return undefined;
}

function addPattern(text: SourceText, pattern: TextPattern, statics: string[]) {
  for (const part of pattern) if (part) statics.push(part);
  const merged: Array<string | null> = [];
  for (const part of pattern) {
    if (part === "") continue;
    const last = merged.at(-1);
    if (part === null) {
      if (last !== null || merged.length === 0) merged.push(null);
    } else if (typeof last === "string") merged[merged.length - 1] = last + part;
    else merged.push(part);
  }
  if (merged.every((part) => part !== null)) text.exact.add(merged.join(""));
  else if (merged.join("").replace(/[^A-Za-z]/g, "").length >= 4) text.templates.push(merged);
}

/** Collects literals and member names; in locale modules, only references and dynamic lookups. */
export function collectSourceText(
  sourceFile: ts.SourceFile,
  text: SourceText = emptySourceText(),
  { locale = false } = {},
): SourceText {
  const statics: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression)) {
      if (isStringNode(node.argumentExpression)) text.exact.add(node.argumentExpression.text);
      else if (locale) text.dynamicLookups.add(node.expression.text);
    } else if (ts.isPropertyAccessExpression(node)) {
      text.members.add(node.name.text);
      if (locale && node.name.text === "get" && ts.isIdentifier(node.expression))
        text.dynamicLookups.add(node.expression.text);
    } else if (
      locale &&
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "Object.hasOwn" &&
      node.arguments[0] &&
      ts.isIdentifier(node.arguments[0])
    ) {
      text.dynamicLookups.add(node.arguments[0].text);
    } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      const name = node.propertyName ?? node.name;
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) text.members.add(name.text);
    }
    if (!locale) {
      if (ts.isJsxText(node)) {
        const jsx = node.text.replace(/\s+/g, " ").trim();
        if (jsx) addPattern(text, [jsx], statics);
      } else if (
        isStringNode(node) ||
        ts.isTemplateExpression(node) ||
        (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)
      ) {
        const pattern = patternOf(node);
        if (pattern) addPattern(text, pattern, statics);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (statics.length) text.fileStatics.push(statics.join("\n").toLowerCase());
  return text;
}

const propertyKey = (name: ts.PropertyName): string | undefined =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
    ? name.text
    : undefined;

// Maps typed by a key union are checked by the compiler, not against source wording.
function hasTypedKeys(declaration: ts.VariableDeclaration): boolean {
  const type = declaration.type?.getText() ?? "";
  const keyType = /Record<\s*([^,]+),/.exec(type)?.[1]?.trim();
  return keyType !== undefined && keyType !== "string";
}

/** Reads object-literal dictionaries and regex literals from a locale module. */
export function collectLocale(sourceFile: ts.SourceFile, file: string) {
  const entries: LocaleEntry[] = [];
  const patterns: LocalePattern[] = [];
  const lineOf = (node: ts.Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      let init: ts.Expression = node.initializer;
      while (ts.isAsExpression(init) || ts.isSatisfiesExpression(init)) init = init.expression;
      const statement = node.parent.parent;
      const exported =
        ts.isVariableStatement(statement) &&
        ts.isSourceFile(statement.parent) &&
        (statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false);
      if (ts.isObjectLiteralExpression(init) && (exported || !hasTypedKeys(node))) {
        for (const property of init.properties) {
          const key =
            ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)
              ? propertyKey(property.name)
              : undefined;
          if (key !== undefined)
            entries.push({ file, line: lineOf(property), dict: node.name.text, key, exported });
        }
      }
    }
    if (ts.isRegularExpressionLiteral(node)) {
      const slash = node.text.lastIndexOf("/");
      patterns.push({
        file,
        line: lineOf(node),
        source: node.text.slice(1, slash),
        flags: node.text.slice(slash + 1),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { entries, patterns };
}

/** Literal runs of a regex source; `required` runs sit outside groups and quantifiers. */
export function regexFragments(source: string): Array<{ text: string; required: boolean }> {
  const fragments: Array<{ text: string; required: boolean }> = [];
  let current = "";
  let depth = 0;
  let topLevelAlternation = false;
  const flush = () => {
    if ((current.match(/[A-Za-z]/g)?.length ?? 0) >= 3)
      fragments.push({ text: current, required: depth === 0 });
    current = "";
  };
  for (let index = 0; index < source.length; index++) {
    const char = source[index]!;
    if (char === "\\") {
      const next = source[++index] ?? "";
      if (/[A-Za-z0-9]/.test(next)) {
        flush();
        if (next === "u" || next === "x")
          index += source[index + 1] === "{" ? 0 : next === "u" ? 4 : 2;
        if (/[pPuk]/.test(next) && source[index + 1] === "{") index = source.indexOf("}", index);
        if (next === "k" && source[index + 1] === "<") index = source.indexOf(">", index);
      } else current += next;
    } else if (char === "[") {
      flush();
      for (index++; index < source.length && source[index] !== "]"; index++)
        if (source[index] === "\\") index++;
    } else if (char === "(") {
      flush();
      depth++;
      if (source[index + 1] === "?") {
        const close = source[index + 2] === "<" && !"=!".includes(source[index + 3] ?? "");
        index = close ? source.indexOf(">", index) : index + (source[index + 2] === "<" ? 3 : 2);
      }
    } else if (char === ")") {
      flush();
      depth--;
    } else if (char === "|") {
      if (depth === 0) topLevelAlternation = true;
      flush();
    } else if ("?*+{".includes(char)) {
      current = current.slice(0, -1);
      flush();
      if (char === "{") index = source.indexOf("}", index);
    } else if ("^$.".includes(char)) flush();
    else current += char;
  }
  flush();
  return topLevelAlternation ? fragments.map(({ text }) => ({ text, required: false })) : fragments;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compiledTemplates = new WeakMap<TextPattern, RegExp>();

/** Whether runtime interpolation of `pattern` can produce exactly `text`. */
export function templateProduces(pattern: TextPattern, text: string): boolean {
  const head = pattern[0];
  const tail = pattern.at(-1);
  if (typeof head === "string" && !text.startsWith(head)) return false;
  if (typeof tail === "string" && !text.endsWith(tail)) return false;
  let regex = compiledTemplates.get(pattern);
  if (!regex) {
    regex = new RegExp(
      `^${pattern.map((part) => (part === null ? "[\\s\\S]*" : escapeRegex(part))).join("")}$`,
    );
    compiledTemplates.set(pattern, regex);
  }
  return regex.test(text);
}

const isLive = (text: SourceText, key: string) =>
  text.exact.has(key) ||
  text.members.has(key) ||
  text.templates.some((pattern) => templateProduces(pattern, key));

const lowerFirst = (value: string) => value.replace(/^./, (char) => char.toLowerCase());

/**
 * A regex is live when a source literal or interpolation sample matches it, or one source
 * file holds all of its required wording. Patterns without required wording are unchecked.
 */
export function patternIsLive(
  pattern: Pick<LocalePattern, "source" | "flags">,
  text: Pick<SourceText, "fileStatics">,
  samples: ReadonlyArray<string>,
): boolean | "unchecked" {
  const required = regexFragments(pattern.source)
    .filter((fragment) => fragment.required)
    .flatMap((fragment) => fragment.text.toLowerCase().split(/[()[\]{}"'`]/))
    .map((piece) => piece.trim())
    .filter((piece) => (piece.match(/[a-z]/g)?.length ?? 0) >= 3);
  if (required.length === 0) return "unchecked";
  const regex = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ""));
  const anchor = required.reduce((a, b) => (b.length > a.length ? b : a));
  for (const sample of samples) {
    if (!sample.toLowerCase().includes(anchor)) continue;
    if (regex.test(sample) || regex.test(lowerFirst(sample))) return true;
  }
  return text.fileStatics.some((statics) =>
    required.every((fragment) => statics.includes(fragment)),
  );
}

const words = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);

/** Finds the source string sharing most words with a key whose own wording no longer occurs. */
export function createNearMatcher(candidates: ReadonlyArray<string>, threshold = 0.7) {
  const candidateWords = candidates.map(words);
  const index = new Map<string, number[]>();
  candidateWords.forEach((set, id) => {
    for (const word of set) {
      const ids = index.get(word);
      if (ids) ids.push(id);
      else index.set(word, [id]);
    }
  });
  return (key: string): string | undefined => {
    const keyWords = words(key);
    if (keyWords.size < 3) return undefined;
    const shared = new Map<number, number>();
    for (const word of keyWords)
      for (const id of index.get(word) ?? []) shared.set(id, (shared.get(id) ?? 0) + 1);
    let best: { id: number; score: number } | undefined;
    for (const [id, count] of shared) {
      const score = count / Math.max(keyWords.size, candidateWords[id]!.size);
      if (score >= threshold && (!best || score > best.score)) best = { id, score };
    }
    return best && candidates[best.id];
  };
}

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of NodeFS.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", "dist", "__tests__", "testFixtures"].includes(entry.name)) continue;
      const path = NodePath.join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(tsx?|json)$/.test(entry.name) && !/\.(test|spec|d)\./.test(entry.name))
        files.push(path);
    }
  };
  walk(root);
  return files;
}

function expandRoots(): string[] {
  return sourceRoots.flatMap((root) => {
    if (!root.includes("*")) return [NodePath.join(repoRoot, root)];
    const [base, rest] = root.split("/*/");
    return NodeFS.readdirSync(NodePath.join(repoRoot, base!))
      .map((name) => NodePath.join(repoRoot, base!, name, rest!))
      .filter((path) => NodeFS.existsSync(path));
  });
}

function addJsonStrings(text: SourceText, value: unknown, statics: string[]): void {
  if (typeof value === "string") addPattern(text, [value], statics);
  else if (value && typeof value === "object")
    for (const item of Object.values(value)) addJsonStrings(text, item, statics);
}

const relative = (path: string) => NodePath.relative(repoRoot, path).replaceAll("\\", "/");
const parse = (path: string) =>
  ts.createSourceFile(path, NodeFS.readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);

/**
 * Contract findings are keys of locale-private runtime maps, regex patterns, and keys that only a
 * runtime lookup (`localizeSettingsText`, `localizeChatText`) reaches when similar source wording
 * exists. Other keys with no reference are listed for review.
 */
export function checkLocaleKeys() {
  const localeDirs = localeRoots.map((root) => NodePath.join(repoRoot, root) + NodePath.sep);
  const text = emptySourceText();
  const entries: LocaleEntry[] = [];
  const patterns: LocalePattern[] = [];
  let fileCount = 0;
  for (const path of expandRoots().flatMap(sourceFiles)) {
    fileCount++;
    if (path.endsWith(".json")) {
      const statics: string[] = [];
      addJsonStrings(text, JSON.parse(NodeFS.readFileSync(path, "utf8")), statics);
      text.fileStatics.push(statics.join("\n").toLowerCase());
      continue;
    }
    const sourceFile = parse(path);
    if (localeDirs.some((dir) => path.startsWith(dir))) {
      const locale = collectLocale(sourceFile, relative(path));
      entries.push(...locale.entries);
      patterns.push(...locale.patterns);
      collectSourceText(sourceFile, text, { locale: true });
    } else collectSourceText(sourceFile, text);
  }

  const samples = [
    ...text.exact,
    ...text.templates.flatMap((parts) =>
      ["1", "X"].map((value) => parts.map((part) => part ?? value).join("")),
    ),
  ];
  const localeKeys = new Set(entries.map((entry) => entry.key));
  const closest = createNearMatcher(
    [
      ...text.exact,
      ...text.templates.map((parts) => parts.map((part) => part ?? "…").join("")),
    ].filter((value) => /\S \S/.test(value) && !localeKeys.has(value)),
  );
  const allowed = new Set(contractAllowlist.map((entry) => entry.id));
  const unreferenced: Finding[] = [];
  const contract: Finding[] = [];
  for (const entry of entries) {
    if (isLive(text, entry.key)) continue;
    const runtime = !entry.exported || text.dynamicLookups.has(entry.dict);
    const near = runtime ? closest(entry.key) : undefined;
    const finding = {
      file: entry.file,
      line: entry.line,
      id: `${entry.dict}:${entry.key}`,
      ...(near === undefined ? {} : { closest: near }),
    };
    if (!entry.exported || near !== undefined) contract.push(finding);
    else unreferenced.push({ ...finding, ...(runtime ? { runtime } : {}) });
  }
  let unchecked = 0;
  for (const pattern of patterns) {
    const live = patternIsLive(pattern, text, samples);
    if (live === "unchecked") unchecked++;
    else if (!live)
      contract.push({
        file: pattern.file,
        line: pattern.line,
        id: `/${pattern.source}/${pattern.flags}`,
      });
  }
  const contractIds = new Set(contract.map((finding) => finding.id));
  return {
    fileCount,
    keyCount: entries.length,
    patternCount: patterns.length,
    uncheckedPatterns: unchecked,
    unreferenced,
    contract: contract.filter((finding) => !allowed.has(finding.id)),
    allowlisted: contract.filter((finding) => allowed.has(finding.id)),
    staleAllowlist: contractAllowlist.filter((entry) => !contractIds.has(entry.id)),
  };
}

function printGroup(title: string, findings: ReadonlyArray<Finding>) {
  console.log(`\n${title}: ${findings.length}`);
  const byFile = Map.groupBy(findings, (finding) => finding.file);
  for (const [file, group] of [...byFile].toSorted(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${file} (${group.length})`);
    for (const finding of group) {
      console.log(
        `    L${finding.line} ${JSON.stringify(finding.id)}${finding.runtime ? " (runtime lookup)" : ""}`,
      );
      if (finding.closest)
        console.log(`      closest source text: ${JSON.stringify(finding.closest)}`);
    }
  }
}

export function main(argv: ReadonlyArray<string>): number {
  const started = Date.now();
  const result = checkLocaleKeys();
  if (argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(
      `Checked ${result.keyCount} locale keys and ${result.patternCount} patterns against ${result.fileCount} source files in ${((Date.now() - started) / 1000).toFixed(1)}s (${result.uncheckedPatterns} patterns have no English wording to check).`,
    );
    printGroup("1. Keys with no reference or matching source text (review)", result.unreferenced);
    printGroup("2. Runtime lookups matching no source text (contract)", result.contract);
    if (result.allowlisted.length)
      console.log(`\nAllowlisted contract findings: ${result.allowlisted.length}`);
    for (const entry of result.staleAllowlist)
      console.log(`Stale allowlist entry (no longer reported): ${entry.id}`);
  }
  return argv.includes("--strict") &&
    (result.contract.length > 0 || result.staleAllowlist.length > 0)
    ? 1
    : 0;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
