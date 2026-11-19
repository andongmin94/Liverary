// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - standalone report over local git objects.
// Report-only audit of an upstream release merge: branding leftovers, excluded-feature
// resurrection, migration id shifts, new English UI literals, and delete/modify cases.
//
//   node scripts/audit-upstream-merge.ts --base <sha> --upstream <sha> [--head <sha>] [--json]
import * as NodeChildProcess from "node:child_process";
import * as NodeUtil from "node:util";

export interface AddedLine {
  readonly path: string;
  readonly line: number;
  readonly text: string;
}

interface BrandingFinding {
  readonly at: string;
  readonly patterns: string[];
  readonly comment: boolean;
  readonly text: string;
}

export const brandingPatterns: ReadonlyArray<{ readonly id: string; readonly pattern: RegExp }> = [
  { id: "T3 Code", pattern: /\bT3 Code\b/ },
  { id: "T3's", pattern: /\bT3's\b/ },
  { id: "t3code", pattern: /\bt3code\b/i },
  { id: ".t3 path", pattern: /(?<![\w.-])\.t3(?![\w-])/ },
  { id: "t3 executable", pattern: /(?<=["'`/\\])t3(?:\.exe|\.cmd|\.sh)?(?=["'`]|$)/ },
  { id: "t3 script", pattern: /-t3\.(?:sh|cmd|ps1|exe)\b/ },
  { id: "versions/<v>/t3", pattern: /\bversions\/[^/\s"'`]+\/t3\b/ },
  { id: "com.t3tools", pattern: /\bcom\.t3tools\b/ },
  {
    id: "t3 CLI hint",
    pattern:
      /(?<![\w./-])t3 (?:service|connect|pair|serve|doctor|config|project|thread|auth|update|login|browser|ssh|wsl)\b/,
  },
];

export const brandingAllowlist: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly reason: string;
}> = [
  { pattern: /\bT3CODE_\w*/g, reason: "environment variable kept for compatibility" },
  { pattern: /@t3tools\/[\w.-]*/g, reason: "workspace package scope" },
  { pattern: /\bt3_\w+/g, reason: "MCP tool name (model-facing protocol id)" },
  { pattern: /\bt3code\/[\w-]+/g, reason: "lint rule id" },
  { pattern: /\boxlint-plugin-t3code\b/g, reason: "lint plugin package" },
  { pattern: /\.t3code\/vcs\.json/g, reason: "legacy VCS selection reader" },
  { pattern: /\bt3\.json\b/g, reason: "legacy project config reader" },
  { pattern: /\bpingdotgg\/t3code[\w./#-]*/g, reason: "upstream repository attribution" },
  { pattern: /[\w.@-]*\bt3\.codes\b[\w./#-]*/g, reason: "upstream schema/service URL" },
];

export const excludedTrees = [
  "docs/",
  ".repos/",
  "apps/marketing/",
  "infra/relay/",
  "infra/task-cache/",
  "packaging/aur/",
  "apps/web/src/i18n/",
  "apps/web/src/components/clerk/",
];

const RESTRICTED_DEPENDENCY =
  /^(?:@clerk\/|gt-react$|gt-next$|generaltranslation$|@generaltranslation\/)/;
const TEST_PATH =
  /(?:^|\/)(?:test|tests|__tests__|testkit|fixtures|e2e)\/|\.(?:test|spec)\.[cm]?[jt]sx?$|TestHarness\.[cm]?[jt]sx?$/i;
const MIGRATIONS_FILE = "apps/server/src/persistence/Migrations.ts";

export const brandingSkippedPaths: ReadonlyArray<{
  readonly prefix: string;
  readonly reason: string;
}> = [
  {
    prefix: ".github/",
    reason: "fork automation and release request kept from the pre-merge fork",
  },
  { prefix: "README.md", reason: "fork-owned; names its upstream base" },
  { prefix: "AGENTS.md", reason: "fork-owned maintenance rules" },
  { prefix: "CLAUDE.md", reason: "fork-owned maintenance rules" },
  { prefix: "patches/", reason: "dependency patch attribution comments" },
];

export const isTestPath = (path: string) => TEST_PATH.test(path);

const isBrandingSkipped = (path: string) =>
  brandingSkippedPaths.some(({ prefix }) => path.startsWith(prefix));

export const excludedTreeOf = (path: string) => excludedTrees.find((tree) => path.startsWith(tree));

export function parseAddedLines(diff: string): AddedLine[] {
  const added: AddedLine[] = [];
  let path: string | undefined;
  let line = 0;
  let previous = "";
  for (const raw of diff.split("\n")) {
    const header = previous.startsWith("--- ");
    previous = raw;
    if (header && raw.startsWith("+++ ")) {
      const target = raw.slice(4).replace(/^"(.*)"$/, "$1");
      path = target === "/dev/null" ? undefined : target.replace(/^b\//, "");
    } else if (raw.startsWith("@@ ")) {
      line = Number(/\+(\d+)/.exec(raw)?.[1] ?? 0);
    } else if (raw.startsWith("+") && path !== undefined) {
      added.push({ path, line, text: raw.slice(1) });
      line++;
    } else if (raw.startsWith(" ")) {
      line++;
    }
  }
  return added;
}

export function brandingMatches(text: string): string[] {
  let stripped = text;
  for (const { pattern } of brandingAllowlist) stripped = stripped.replace(pattern, " ");
  return brandingPatterns.filter(({ pattern }) => pattern.test(stripped)).map(({ id }) => id);
}

const UI_ATTRIBUTE =
  /\b(?:aria-label|title|placeholder|label)=(?:\{\s*)?(["'`])([^"'`{}]+)\1|\b(?:label|title|placeholder)\s*:\s*(["'`])([^"'`{}]+)\3/g;
const JSX_TEXT = /(?<![=-])>\s*([^<>{}]+?)\s*</g;
const BARE_TEXT_LINE = /^\s*([A-Z][A-Za-z']*(?: [A-Za-z'][\w'-]*)*[.!?…]?)\s*$/;

export function isEnglishUiText(value: string): boolean {
  const text = value.trim();
  if (!/^[A-Za-z]/.test(text) || !/[A-Za-z]{2,}/.test(text) || /[가-힣]/.test(text)) return false;
  if (/^[A-Z0-9_]+$/.test(text) || text === "Liverary") return false;
  if (!text.includes(" ")) return /^[A-Z][a-z]+$/.test(text);
  return !/^[\w.:/-]+$/.test(text) && !/[=;()[\]]|=>|&&|\|\|/.test(text);
}

export function uiLiterals(path: string, text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(UI_ATTRIBUTE)) {
    const value = match[2] ?? match[4] ?? "";
    if (isEnglishUiText(value)) found.push(value);
  }
  if (path.endsWith(".tsx")) {
    for (const match of text.matchAll(JSX_TEXT)) {
      if (isEnglishUiText(match[1] ?? "")) found.push(match[1] ?? "");
    }
    const bare = BARE_TEXT_LINE.exec(text)?.[1];
    if (bare && bare.includes(" ") && isEnglishUiText(bare)) found.push(bare);
  }
  return [...new Set(found)];
}

export const isUiSourcePath = (path: string) =>
  !isTestPath(path) &&
  ((path.startsWith("apps/web/src/") && path.endsWith(".tsx")) ||
    (path.startsWith("apps/desktop/src/") && /\.tsx?$/.test(path)));

export function parseMigrationEntries(source: string): Map<string, number> {
  const entries = new Map<string, number>();
  for (const match of source.matchAll(/^\s*\[(\d+),\s*"([^"]+)"/gm)) {
    entries.set(match[2] ?? "", Number(match[1]));
  }
  return entries;
}

export function restrictedDependencies(basePackage: string, headPackage: string): string[] {
  const names = (source: string) => {
    if (source === "") return new Set<string>();
    const manifest = JSON.parse(source) as Record<string, Record<string, string> | undefined>;
    const fields = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
    return new Set(fields.flatMap((field) => Object.keys(manifest[field] ?? {})));
  };
  const base = names(basePackage);
  return [...names(headPackage)].filter(
    (name) => !base.has(name) && RESTRICTED_DEPENDENCY.test(name),
  );
}

function git(args: ReadonlyArray<string>, allowFailure = false): string {
  const result = NodeChildProcess.spawnSync("git", ["-c", "core.quotePath=false", ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (result.status !== 0) {
    if (allowFailure) return "";
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.error?.message}`);
  }
  return result.stdout;
}

const listTree = (rev: string) =>
  new Set(git(["ls-tree", "-r", "--name-only", "-z", rev]).split("\0").filter(Boolean));

const showFile = (rev: string, path: string) => git(["show", `${rev}:${path}`], true);

export function audit(options: { base: string; upstream: string; head: string }) {
  const { base, upstream, head } = options;
  const mergeBase = git(["merge-base", base, upstream]).trim();
  const added = parseAddedLines(git(["diff", "--no-color", "--no-ext-diff", "-U0", base, head]));
  const at = ({ path, line }: AddedLine) => `${path}:${line}`;

  const branding = { source: [] as BrandingFinding[], test: [] as BrandingFinding[] };
  for (const entry of added) {
    if (excludedTreeOf(entry.path) || isBrandingSkipped(entry.path)) continue;
    const patterns = brandingMatches(entry.text);
    if (patterns.length === 0) continue;
    const text = entry.text.trim();
    (isTestPath(entry.path) ? branding.test : branding.source).push({
      at: at(entry),
      patterns,
      comment: /^(?:\/\/|\/\*|\*|#)/.test(text),
      text,
    });
  }

  const excludedPaths = git(["diff", "--name-status", "--diff-filter=d", base, head])
    .split("\n")
    .filter(Boolean)
    .map((row) => row.split("\t"))
    .map((columns) => ({ status: columns[0] ?? "", path: columns.at(-1) ?? "" }))
    .filter(({ path }) => excludedTreeOf(path));
  const dependencies = ["apps/web/package.json", "apps/desktop/package.json"].flatMap((file) =>
    restrictedDependencies(showFile(base, file), showFile(head, file)).map((name) => ({
      file,
      name,
    })),
  );
  const nightly = added
    .filter(
      ({ path, text }) =>
        /^apps\/(?:desktop|web)\/src\//.test(path) && !isTestPath(path) && /nightly/i.test(text),
    )
    .map((entry) => ({ at: at(entry), text: entry.text.trim() }));

  const before = parseMigrationEntries(showFile(mergeBase, MIGRATIONS_FILE));
  const upstreamMigrations = parseMigrationEntries(showFile(upstream, MIGRATIONS_FILE));
  const headMigrations = parseMigrationEntries(showFile(head, MIGRATIONS_FILE));
  const nameById = (entries: Map<string, number>) =>
    new Map([...entries].map(([name, id]) => [id, name]));
  const upstreamNameById = nameById(upstreamMigrations);
  const headNameById = nameById(headMigrations);
  const upstreamAdded = [...upstreamMigrations]
    .filter(([name]) => !before.has(name))
    .map(([name, upstreamId]) => ({ name, upstreamId, headId: headMigrations.get(name) ?? null }));
  const forkOnly = [...headMigrations]
    .filter(([name]) => !upstreamMigrations.has(name))
    .map(([name, id]) => ({ name, id }));
  const literalPattern = /toMigrationInclusive:\s*(\d+)/;
  const allLiterals = git(["grep", "-n", "-E", "toMigrationInclusive:\\s*[0-9]+", head], true)
    .split("\n")
    .filter(Boolean)
    .map((row) =>
      row
        .slice(head.length + 1)
        .split(":")
        .slice(0, 2)
        .join(":"),
    );
  const addedLiterals = added.flatMap((entry) => {
    const value = Number(literalPattern.exec(entry.text)?.[1] ?? NaN);
    if (Number.isNaN(value)) return [];
    const upstreamName = upstreamNameById.get(value) ?? null;
    const headName = headNameById.get(value) ?? null;
    return [
      {
        at: at(entry),
        value,
        headName,
        upstreamName,
        ambiguous: upstreamName !== null && headName !== null && upstreamName !== headName,
      },
    ];
  });

  const uiText = added.flatMap((entry) => {
    if (!isUiSourcePath(entry.path)) return [];
    const literals = uiLiterals(entry.path, entry.text);
    return literals.length === 0 ? [] : [{ at: at(entry), literals }];
  });

  const headTree = listTree(head);
  const baseTree = listTree(base);
  const deleteModify = git([
    "diff",
    "--name-status",
    "--no-renames",
    "--diff-filter=d",
    mergeBase,
    upstream,
  ])
    .split("\n")
    .map((row) => row.split("\t"))
    .filter(([status, path]) => status !== "" && path !== undefined && !headTree.has(path))
    .map(([status, path = ""]) => ({
      path,
      upstreamChange: status === "A" ? "added" : "modified",
      deletedByMerge: baseTree.has(path),
      excluded: excludedTreeOf(path) !== undefined,
    }));

  return {
    revisions: { base, upstream, head, mergeBase },
    branding,
    excluded: { paths: excludedPaths, dependencies, nightly },
    migrations: {
      upstreamAdded,
      forkOnly,
      literalCount: allLiterals.length,
      allLiterals,
      addedLiterals,
    },
    uiText,
    deleteModify,
  };
}

type Report = ReturnType<typeof audit>;

function formatReport(report: Report): string {
  const out: string[] = [];
  const section = (title: string, rows: ReadonlyArray<string>) => {
    out.push(`\n== ${title} (${rows.length})`);
    out.push(...rows.map((row) => `  ${row}`));
  };
  const { revisions, branding, excluded, migrations, uiText, deleteModify } = report;
  out.push(
    `base ${revisions.base}  upstream ${revisions.upstream}  head ${revisions.head}  merge-base ${revisions.mergeBase}`,
  );
  const brandingRow = ({ at, patterns, comment, text }: BrandingFinding) =>
    `${at}  [${patterns.join(", ")}]${comment ? " (comment)" : ""}  ${text}`;
  section("1. Branding leftovers: source", branding.source.map(brandingRow));
  section("1. Branding leftovers: tests", branding.test.map(brandingRow));
  section(
    "2. Excluded trees added/changed",
    excluded.paths.map(({ status, path }) => `${status}\t${path}`),
  );
  section(
    "2. Restricted dependencies added",
    excluded.dependencies.map(({ file, name }) => `${file}: ${name}`),
  );
  section(
    "2. New nightly identifiers",
    excluded.nightly.map(({ at, text }) => `${at}  ${text}`),
  );
  section(
    "3. Upstream migrations added (best-effort, by name)",
    migrations.upstreamAdded.map(
      ({ name, upstreamId, headId }) =>
        `${name}: upstream ${upstreamId} -> head ${headId ?? "missing"}`,
    ),
  );
  section(
    "3. Fork-only migrations in head",
    migrations.forkOnly.map(({ name, id }) => `${id} ${name}`),
  );
  out.push(`  toMigrationInclusive literals in head: ${migrations.literalCount}`);
  section(
    "3. toMigrationInclusive literals added by the merge",
    migrations.addedLiterals.map(
      ({ at, value, headName, upstreamName, ambiguous }) =>
        `${at}  ${value} = head ${headName ?? "none"}${
          ambiguous ? `, upstream ${upstreamName ?? "none"}  CHECK` : ""
        }`,
    ),
  );
  section(
    "4. New English UI literals (heuristic)",
    uiText.map(
      ({ at, literals }) => `${at}  ${literals.map((text) => JSON.stringify(text)).join(", ")}`,
    ),
  );
  section(
    "5. Upstream-changed files missing in head",
    deleteModify.map(
      ({ path, upstreamChange, deletedByMerge, excluded: isExcluded }) =>
        `${path}  (upstream ${upstreamChange}${deletedByMerge ? ", deleted by this merge" : ""}${
          isExcluded ? ", excluded tree" : ""
        })`,
    ),
  );
  return out.join("\n");
}

if (import.meta.main) {
  const usage =
    "Usage: node scripts/audit-upstream-merge.ts --base <sha> --upstream <sha> [--head <sha>] [--json]";
  let values: { base?: string; upstream?: string; head?: string; json?: boolean };
  try {
    values = NodeUtil.parseArgs({
      options: {
        base: { type: "string" },
        upstream: { type: "string" },
        head: { type: "string", default: "HEAD" },
        json: { type: "boolean", default: false },
      },
    }).values;
  } catch (error) {
    console.error(`${(error as Error).message}\n${usage}`);
    process.exit(2);
  }
  if (!values.base || !values.upstream) {
    console.error(usage);
    process.exit(2);
  }
  try {
    const report = audit({
      base: values.base,
      upstream: values.upstream,
      head: values.head ?? "HEAD",
    });
    console.log(values.json ? JSON.stringify(report, null, 2) : formatReport(report));
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
