// @effect-diagnostics nodeBuiltinImport:off globalConsole:off globalDate:off - Standalone Windows tooling that drives wsl.exe.
// Runs the release CI's Linux check from a Windows checkout: syncs HEAD plus the working tree
// into a reusable WSL clone, installs the pinned Node/pnpm toolchain there, runs
// `check:changed` like CI, then runs the fork-added tests that adjacency selection can skip.
//
//   node scripts/linux-check.ts --base <sha> [--distro Ubuntu-24.04] [--concurrency 4]
//                               [--upstream <sha>] [--out <dir>] [--keep] [--verbose]
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeUtil from "node:util";

export interface Options {
  readonly base: string;
  readonly distro: string;
  readonly concurrency: number;
  readonly upstream: string | undefined;
  readonly out: string | undefined;
  readonly keep: boolean;
  readonly verbose: boolean;
}

export const usage =
  "usage: node scripts/linux-check.ts --base <sha> [--distro Ubuntu-24.04] [--concurrency 4] " +
  "[--upstream <sha>] [--out <dir>] [--keep] [--verbose]";

export function parseOptions(args: ReadonlyArray<string>): Options {
  const { values } = NodeUtil.parseArgs({
    args: [...args],
    strict: true,
    options: {
      base: { type: "string" },
      distro: { type: "string", default: "Ubuntu-24.04" },
      concurrency: { type: "string", default: "4" },
      upstream: { type: "string" },
      out: { type: "string" },
      keep: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
    },
  });
  if (!values.base) throw new Error(`--base is required\n${usage}`);
  const concurrency = Number(values.concurrency);
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`--concurrency must be a positive integer, got ${values.concurrency}`);
  }
  return {
    base: values.base,
    distro: values.distro,
    concurrency,
    upstream: values.upstream,
    out: values.out,
    keep: values.keep,
    verbose: values.verbose,
  };
}

export function toWslPath(windowsPath: string): string {
  const match = /^([A-Za-z]):[\\/]*(.*)$/.exec(windowsPath);
  if (!match) throw new Error(`Not a drive-letter path WSL can mount: ${windowsPath}`);
  const rest = match[2]!
    .split(/[\\/]+/)
    .filter(Boolean)
    .join("/");
  return `/mnt/${match[1]!.toLowerCase()}${rest ? `/${rest}` : ""}`;
}

const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007/g;
export const stripAnsi = (text: string) => text.replace(ANSI, "");

export interface StepResult {
  readonly outcome: "pass" | "FAIL" | "TIMEOUT";
  readonly name: string;
  readonly time: string;
}

export function parseCheckSummary(log: string): Array<StepResult> {
  const lines = stripAnsi(log).split(/\r?\n/);
  const start = lines.lastIndexOf("check:changed summary");
  if (start === -1) return [];
  const steps: Array<StepResult> = [];
  for (const line of lines.slice(start + 1)) {
    const match = /^ {2}(pass|FAIL|TIMEOUT) {2}(.+?) {2}(\S.*)$/.exec(line);
    if (match)
      steps.push({ outcome: match[1] as StepResult["outcome"], name: match[2]!, time: match[3]! });
  }
  return steps;
}

// Vitest's failure report lines: ` FAIL  <project label> path/to/file.test.ts > suite > test`.
export function parseTestFailures(log: string): Map<string, Array<string>> {
  const failures = new Map<string, Array<string>>();
  for (const line of stripAnsi(log).split(/\r?\n/)) {
    const match =
      /^\s*FAIL\s+(?:.*?\s)?(\S+\.test\.[cm]?[jt]sx?)(?:\s+>\s+(.*?))?(?:\s+\[.*\])?\s*$/.exec(
        line,
      );
    if (!match) continue;
    const file = match[1]!;
    const test = match[2] ?? "(file failed)";
    const tests = failures.get(file) ?? [];
    if (!tests.includes(test)) tests.push(test);
    failures.set(file, tests);
  }
  return failures;
}

// Mirrors check:changed: .github/scripts tests run under `node --test`, everything else under vitest.
export function forkSuite(added: ReadonlyArray<string>, existing: ReadonlySet<string>) {
  const files = [...new Set(added)].filter((file) => existing.has(file)).sort();
  const isNodeTest = (file: string) => file.startsWith(".github/scripts/");
  return {
    vitest: files.filter((file) => !isNodeTest(file)),
    node: files.filter(isNodeTest),
  };
}

export const formatDuration = (ms: number) => {
  const seconds = Math.round(ms / 1000);
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`
    : `${seconds}s`;
};

// Values reach bash as positional arguments through `wsl.exe --exec`, never interpolated.
const WSL_SCRIPT = String.raw`set -euo pipefail
cache="$HOME/.cache/liverary-linux-check"
repo="$cache/repo"
phase=$1 nodever=$2
nodedir="$cache/node-v$nodever"
export PATH="$nodedir/bin:$(printf %s "$PATH" | tr : '\n' | grep -v '^/mnt/' | paste -sd: -)"
export CI=true
g() { git -c safe.directory='*' -c core.quotePath=false "$@"; }

if [ "$phase" = sync ]; then
  win=$3 out=$4 head=$5 pnpmver=$6 upstream=$7
  mkdir -p "$cache"
  if [ ! -x "$nodedir/bin/node" ]; then
    case "$(uname -m)" in x86_64) arch=x64 ;; aarch64) arch=arm64 ;; *) echo "unsupported arch $(uname -m)"; exit 1 ;; esac
    name="node-v$nodever-linux-$arch.tar.xz"
    tmp=$(mktemp -d "$cache/node-download.XXXXXX")
    echo "Downloading Node $nodever"
    curl -fsSL -o "$tmp/$name" "https://nodejs.org/dist/v$nodever/$name"
    curl -fsSL -o "$tmp/SHASUMS256.txt" "https://nodejs.org/dist/v$nodever/SHASUMS256.txt"
    (cd "$tmp" && grep -F "  $name" SHASUMS256.txt | sha256sum -c --quiet -)
    mkdir "$tmp/node" && tar -xJf "$tmp/$name" -C "$tmp/node" --strip-components=1
    mv "$tmp/node" "$nodedir" && rm -rf "$tmp"
  fi
  if [ "$(pnpm --version 2>/dev/null || true)" != "$pnpmver" ]; then
    echo "Installing pnpm $pnpmver"
    npm install -g --silent "pnpm@$pnpmver"
  fi
  echo "node $(node --version), pnpm $(pnpm --version)"
  [ -d "$repo/.git" ] || g init -q "$repo"
  cd "$repo"
  echo "Fetching from $win"
  g fetch -q --no-tags --force "$win" "+HEAD:refs/liverary/head" "+refs/heads/*:refs/remotes/win/*" \
    "+refs/remotes/origin/*:refs/remotes/origin/*" "+refs/tags/*:refs/tags/*"
  [ "$(g rev-parse refs/liverary/head)" = "$head" ] || { echo "Windows HEAD moved during the fetch; rerun."; exit 1; }
  g checkout -q -f --detach "$head" && g clean -qfd
  [ -s "$out/working.patch" ] && g apply --binary --whitespace=nowarn "$out/working.patch"
  [ -s "$out/untracked.list" ] && (cd "$win" && xargs -0 cp --parents -t "$repo" < "$out/untracked.list")
  g add -A
  if ! g diff --cached --quiet; then
    g -c user.name=linux-check -c user.email=linux-check@localhost commit -q --no-verify -m "Windows working tree"
    # Rewrite copied files from the index so eol=lf applies to them too.
    [ -s "$out/untracked.list" ] && xargs -0 rm -f < "$out/untracked.list" && g checkout -q -- .
    echo "Synced $head plus working-tree changes as $(g rev-parse --short HEAD)"
  else
    echo "Synced $head (no working-tree changes)"
  fi
  pnpm install --frozen-lockfile
  node apps/web/node_modules/playwright/cli.js install --only-shell chromium
  ./node_modules/.bin/vp run --filter @t3tools/desktop ensure:electron
  pkg-config --exists libsecret-1 2>/dev/null ||
    echo "warning: libsecret-1-dev is missing (CI installs it): sudo apt-get install -y libsecret-1-dev pkg-config"
  command -v jq >/dev/null || echo "warning: jq is missing (CI runners have it; scripts/check-upstream.test.ts needs it): sudo apt-get install -y jq"
  g cat-file -e "$upstream^{commit}" || { echo "upstream $upstream is not in the synced history"; exit 1; }
  g diff --diff-filter=A --name-only -z "$upstream" HEAD -- '*.test.ts' '*.test.tsx' '*.test.mjs' > "$out/fork-added.list"
  g ls-files -z > "$out/tracked.list"
elif [ "$phase" = check ]; then
  cd "$repo"
  ./node_modules/.bin/vp run check:changed "$3" --concurrency "$4" --timeout 3600
elif [ "$phase" = fork ]; then
  cd "$repo"
  mapfile -d '' vitest < "$3"
  mapfile -d '' nodetests < "$4"
  status=0
  if [ \${#vitest[@]} -gt 0 ]; then ./node_modules/.bin/vp test run --passWithNoTests --maxWorkers "$5" "\${vitest[@]}" || status=1; fi
  if [ \${#nodetests[@]} -gt 0 ]; then node --test "\${nodetests[@]}" || status=1; fi
  exit $status
fi
`.replaceAll("\\$", "$");

const git = (root: string, args: ReadonlyArray<string>) =>
  NodeChildProcess.execFileSync("git", ["-c", "core.quotePath=false", ...args], {
    cwd: root,
    maxBuffer: 1024 ** 3,
  });

const readNulList = (file: string) =>
  NodeFS.existsSync(file) ? NodeFS.readFileSync(file, "utf8").split("\0").filter(Boolean) : [];

const decodeWslMessage = (buffer: Buffer) =>
  buffer.includes(0) ? buffer.toString("utf16le").replaceAll("\0", "") : buffer.toString("utf8");

function runWsl(
  distro: string,
  args: ReadonlyArray<string>,
  logFile: string,
  show: (line: string) => boolean,
): Promise<{ ok: boolean; ms: number; log: string }> {
  const started = Date.now();
  const log = NodeFS.createWriteStream(logFile);
  const child = NodeChildProcess.spawn("wsl.exe", ["-d", distro, "--exec", "bash", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const chunks: Array<Buffer> = [];
  let partial = "";
  const onData = (data: Buffer) => {
    chunks.push(data);
    log.write(data);
    const lines = (partial + data.toString("utf8")).split(/\r?\n/);
    partial = lines.pop() ?? "";
    for (const line of lines) if (show(stripAnsi(line))) console.log(`  ${stripAnsi(line)}`);
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  return new Promise((resolve) => {
    child.on("close", (code) => {
      log.end();
      resolve({
        ok: code === 0,
        ms: Date.now() - started,
        log: decodeWslMessage(Buffer.concat(chunks)),
      });
    });
    child.on("error", (error) => {
      log.end();
      resolve({ ok: false, ms: Date.now() - started, log: error.message });
    });
  });
}

function printFailures(failures: Map<string, Array<string>>) {
  for (const [file, tests] of failures) {
    console.log(`      ${file}`);
    for (const test of tests) console.log(`        - ${test}`);
  }
}

async function main(argv: ReadonlyArray<string>): Promise<number> {
  // oxlint-disable-next-line t3code/no-global-process-runtime -- Standalone Node tooling has no Effect runtime.
  if (process.platform !== "win32") {
    console.error(
      "linux-check drives WSL from a Windows checkout. On Linux, run the check directly:\n" +
        "  CI=true vp run check:changed <base> --concurrency 2 --timeout 3600",
    );
    return 2;
  }
  let options: Options;
  try {
    options = parseOptions(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
  const started = Date.now();
  const root = NodeFS.realpathSync.native(
    git(process.cwd(), ["rev-parse", "--show-toplevel"]).toString().trim(),
  );
  const pkg = JSON.parse(NodeFS.readFileSync(NodePath.join(root, "package.json"), "utf8"));
  const nodeVersion = String(pkg.engines?.node ?? "").replace(/^v/, "");
  const pnpmVersion = /^pnpm@([^+]+)/.exec(String(pkg.packageManager ?? ""))?.[1];
  if (!/^\d+\.\d+\.\d+$/.test(nodeVersion) || !pnpmVersion) {
    console.error("package.json needs an exact engines.node and a pnpm packageManager.");
    return 2;
  }
  const upstream =
    options.upstream ??
    JSON.parse(NodeFS.readFileSync(NodePath.join(root, ".github/liverary-release.json"), "utf8"))
      .upstream_sha;

  const distros = decodeWslMessage(NodeChildProcess.execFileSync("wsl.exe", ["-l", "-q"]))
    .split(/\r?\n/)
    .map((line) => line.trim());
  if (!distros.includes(options.distro)) {
    console.error(
      `WSL distro ${options.distro} not found. Installed: ${distros.filter(Boolean).join(", ")}`,
    );
    return 2;
  }

  const out = NodeFS.realpathSync.native(
    options.out
      ? (NodeFS.mkdirSync(options.out, { recursive: true }), options.out)
      : NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "liverary-linux-check-")),
  );
  const outRelative = NodePath.relative(root, out);
  const excludeOut =
    outRelative && !outRelative.startsWith("..") && !NodePath.isAbsolute(outRelative)
      ? [`:(exclude)${outRelative.replaceAll("\\", "/")}`]
      : [];
  const head = git(root, ["rev-parse", "HEAD"]).toString().trim();
  NodeFS.writeFileSync(
    NodePath.join(out, "working.patch"),
    git(root, ["diff", "--no-ext-diff", "--binary", "HEAD", "--", ".", ...excludeOut]),
  );
  NodeFS.writeFileSync(
    NodePath.join(out, "untracked.list"),
    git(root, ["ls-files", "-z", "--others", "--exclude-standard", "--", ".", ...excludeOut]),
  );
  const script = NodePath.join(out, "linux-check.sh");
  NodeFS.writeFileSync(script, WSL_SCRIPT);
  const wslScript = toWslPath(script);
  const wslOut = toWslPath(out);
  const untrackedCount = readNulList(NodePath.join(out, "untracked.list")).length;
  console.log(
    `linux-check: ${options.distro}, HEAD ${head.slice(0, 10)}, base ${options.base}, logs in ${out}`,
  );
  if (NodeFS.statSync(NodePath.join(out, "working.patch")).size > 0 || untrackedCount > 0) {
    console.log(`  including working-tree changes (${untrackedCount} untracked files)`);
  }

  const rows: Array<string> = [];
  let failed = false;
  const record = (name: string, result: { ok: boolean; ms: number }) => {
    rows.push(`  ${result.ok ? "pass" : "FAIL"}  ${name}  ${formatDuration(result.ms)}`);
    if (!result.ok) failed = true;
  };

  console.log("\n[1/3] sync and toolchain");
  const sync = await runWsl(
    options.distro,
    [wslScript, "sync", nodeVersion, toWslPath(root), wslOut, head, pnpmVersion, upstream],
    NodePath.join(out, "sync.log"),
    (line) => options.verbose || !/^\s*$|^(Progress|Packages):|^\s*[|│]|^\++$/.test(line),
  );
  record("sync and toolchain", sync);
  const summary: Array<string> = [];
  if (sync.ok) {
    console.log("\n[2/3] check:changed");
    const check = await runWsl(
      options.distro,
      [wslScript, "check", nodeVersion, options.base, String(options.concurrency)],
      NodePath.join(out, "check.log"),
      (line) => options.verbose || /^> vp |^check:changed summary/.test(line),
    );
    record("check:changed", check);
    for (const step of parseCheckSummary(check.log))
      summary.push(`    ${step.outcome}  ${step.name}  ${step.time}`);
    if (!check.ok && summary.length === 0) summary.push("    (no step summary; see check.log)");
    const checkFailures = parseTestFailures(check.log);

    const suite = forkSuite(
      readNulList(NodePath.join(out, "fork-added.list")),
      new Set(readNulList(NodePath.join(out, "tracked.list"))),
    );
    NodeFS.writeFileSync(
      NodePath.join(out, "fork-vitest.list"),
      suite.vitest.map((file) => `${file}\0`).join(""),
    );
    NodeFS.writeFileSync(
      NodePath.join(out, "fork-node.list"),
      suite.node.map((file) => `${file}\0`).join(""),
    );
    const forkCount = suite.vitest.length + suite.node.length;
    console.log(`\n[3/3] fork suite (${forkCount} files added since ${upstream.slice(0, 10)})`);
    const fork = await runWsl(
      options.distro,
      [
        wslScript,
        "fork",
        nodeVersion,
        `${wslOut}/fork-vitest.list`,
        `${wslOut}/fork-node.list`,
        String(options.concurrency),
      ],
      NodePath.join(out, "fork.log"),
      (line) => options.verbose || /^\s*(Test Files|Tests) {2}|^ℹ (pass|fail) /.test(line),
    );
    record(`fork suite (${forkCount} files)`, fork);
    const forkFailures = parseTestFailures(fork.log);

    console.log("\nlinux-check summary");
    console.log(rows[0]);
    console.log(rows[1]);
    for (const line of summary) console.log(line);
    if (checkFailures.size > 0) {
      console.log("    failing tests:");
      printFailures(checkFailures);
    }
    console.log(rows[2]);
    if (forkFailures.size > 0) {
      console.log("    failing tests:");
      printFailures(forkFailures);
    }
  } else {
    console.log("\nlinux-check summary");
    console.log(rows[0]);
    console.log("  sync failed; see sync.log");
  }
  console.log(`  total ${formatDuration(Date.now() - started)}`);
  console.log(`  logs: ${out}`);

  if (!options.keep) {
    for (const file of [
      "linux-check.sh",
      "working.patch",
      "untracked.list",
      "fork-added.list",
      "tracked.list",
      "fork-vitest.list",
      "fork-node.list",
    ]) {
      NodeFS.rmSync(NodePath.join(out, file), { force: true });
    }
  }
  return failed ? 1 : 0;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
