// Unknown paths check every package; recognized packages pull in their dependents.
// scripts/check-changed.ts shares these decisions so local checks match CI.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

const INERT = [
  /^docs\//,
  /^\.(agents|cursor|vscode|devcontainer|macroscope|repos)\//,
  /^\.github\/[^/]+\.md$/,
  /^\.github\/ISSUE_TEMPLATE\//,
  /^knip\.jsonc$/,
  /^[^/]+\.md$/,
  /^LICENSE$/,
  /^(실행기|Liverary-dev)\.cmd$/,
];

const CHECK_ONLY = [
  /^\.github\/workflows\/(check-upstream|publish-release)\.yml$/,
  /^\.github\/scripts\/retire-releases\.cjs$/,
  /^scripts\/check-(changed(-command)?|upstream)\.ts$/,
  /^apps\/mobile\/src\//,
  /^(?:(?:apps|packages)\/[^/]+\/(?:src|scripts|test)|scripts|\.github\/scripts)\/.*\.test\.[cm]?[jt]sx?$/,
];

function isInert(file) {
  return INERT.some((pattern) => pattern.test(file));
}

function ciRequirements(files) {
  const active = files.filter((file) => !isInert(file));
  return {
    buildDesktop: active.some((file) => !CHECK_ONLY.some((pattern) => pattern.test(file))),
    prepareRuntime:
      active.length > 0 || files.some((file) => /\.(?:[cm]?[jt]sx?|astro)$/.test(file)),
  };
}

// Shared test setup and vendored mobile dependencies affect every package.
const RUNS_EVERYTHING = [
  /^packages\/shared\/src\/(HostProcess|testing\/(longTempDir|providerEnv))\.ts$/,
  /^apps\/mobile\/deps\//,
];

// Includes cross-package reads absent from package.json dependencies.
const EXTRA_OWNERS = [
  // The web build embeds the running app's upstream release tag.
  [/^\.github\/liverary-release\.json$/, ["@t3tools/web"]],
  [/^\.github\/(workflows|actions|scripts)\//, ["@t3tools/scripts"]],
  [/^\.github\/triage\/PLAYBOOK\.md$/, ["t3"]],
  // Vite configs and tsconfigs of these apps import scripts/lib directly.
  [/^scripts\/lib\//, ["@t3tools/desktop", "@t3tools/mobile", "@t3tools/web", "t3"]],
  // scripts/build-desktop-artifact.ts reads the GNOME extension manifest.
  [/^apps\/desktop\/gnome-extension\//, ["@t3tools/scripts"]],
  [/^native\/browser-secret\//, ["@t3tools/desktop"]],
  [/^native\/kde-snap-shot\//, ["@t3tools/desktop"]],
  [/^native\/libghostty-vt\//, ["@t3tools/web"]],
];
const RUST = /^native\/(resource-monitor|kde-snap-shot|hyprland-snap-shot)\//;

// These tests read other packages without declaring dependencies.
const TEST_ONLY_DEPS = {
  // Evals import the server's source to test its real model-facing text.
  "@t3tools/evals": ["t3"],
  "@t3tools/provider-pi": ["@t3tools/client-runtime"],
  "@t3tools/scripts": [
    "@t3tools/desktop",
    "@t3tools/mobile",
    "@t3tools/web",
    "t3",
    "@t3tools/provider-cursor",
  ],
};
// The server bundles the web build without importing it.
const BUILD_ONLY_DEPS = { t3: ["@t3tools/web"] };

function readWorkspace() {
  const patterns = [];
  let inPackages = false;
  for (const line of fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8").split("\n")) {
    if (/^\S/.test(line)) inPackages = line.startsWith("packages:");
    const entry = inPackages && line.match(/^\s+-\s+["']?([^"'\s]+)/);
    if (entry) patterns.push(entry[1]);
  }

  const dirs = patterns.flatMap((pattern) => {
    if (!pattern.endsWith("/*")) return [pattern];
    const parent = pattern.slice(0, -2);
    return fs.readdirSync(path.join(root, parent)).map((name) => `${parent}/${name}`);
  });

  const packages = [];
  for (const dir of dirs) {
    const manifestPath = path.join(root, dir, "package.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const deps = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    };
    packages.push({
      name: manifest.name,
      dir,
      deps: Object.keys(deps).filter(
        (dep) =>
          String(deps[dep]).startsWith("workspace:") &&
          !BUILD_ONLY_DEPS[manifest.name]?.includes(dep),
      ),
    });
  }
  return packages;
}

// [] means inert; null means unknown and requires every package.
function ownersOf(file, packages) {
  const extra = EXTRA_OWNERS.flatMap(([pattern, names]) => (pattern.test(file) ? names : []));
  if (isInert(file)) return extra;
  if (RUNS_EVERYTHING.some((pattern) => pattern.test(file))) return null;
  // scripts/build-desktop-artifact.test.ts reads the crates' sources.
  if (RUST.test(file)) return ["@t3tools/scripts", ...extra];

  const owner = packages
    .filter((pkg) => file.startsWith(`${pkg.dir}/`))
    .sort((a, b) => b.dir.length - a.dir.length)[0];
  if (owner) return [owner.name, ...extra];
  return extra.length > 0 ? extra : null;
}

function decide(files, packages) {
  const all = new Set(packages.map((pkg) => pkg.name));
  let affected = new Set();
  let everything = false;

  for (const file of files) {
    const owners = ownersOf(file, packages);
    if (owners === null) {
      everything = true;
      console.error(`Runs everything: ${file}`);
    } else {
      for (const owner of owners) affected.add(owner);
    }
  }

  if (everything) {
    affected = all;
  } else {
    let grew = true;
    while (grew) {
      grew = false;
      for (const pkg of packages) {
        if (!affected.has(pkg.name) && pkg.deps.some((dep) => affected.has(dep))) {
          affected.add(pkg.name);
          grew = true;
        }
      }
    }
    for (const [name, deps] of Object.entries(TEST_ONLY_DEPS)) {
      if (deps.some((dep) => affected.has(dep))) affected.add(name);
    }
  }

  return { affected: [...affected].sort() };
}

module.exports = { readWorkspace, decide, ciRequirements };

if (require.main === module) {
  const files = fs.readFileSync(0, "utf8").split("\0").filter(Boolean);
  const { buildDesktop, prepareRuntime } = ciRequirements(files);
  console.log(`build_desktop=${buildDesktop}\nprepare_runtime=${prepareRuntime}`);
}
