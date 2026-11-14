// @effect-diagnostics nodeBuiltinImport:off - executes the workflow shell with isolated temporary fixtures.
import * as NodeAssert from "node:assert/strict";
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { it } from "@effect/vitest";

const workflow = NodeFS.readFileSync(
  new URL("../.github/workflows/check-upstream.yml", import.meta.url),
  "utf8",
);
const run = workflow.split("        run: |\n")[1];
NodeAssert.ok(run);
const script = run.replace(/^          /gm, "");
const mainSha = "a".repeat(40);
const upstreamSha = "b".repeat(40);
const publishedSha = "c".repeat(40);
const releaseWorkflow = NodeFS.readFileSync(
  new URL("../.github/workflows/release.yml", import.meta.url),
  "utf8",
);
const releaseRun = releaseWorkflow.match(/        run: \|\n((?:          .*\n|\n)+)/)?.[1];
NodeAssert.ok(releaseRun);
const releaseScript = releaseRun.replace(/^          /gm, "");
const publishWorkflow = NodeFS.readFileSync(
  new URL("../.github/workflows/publish-release.yml", import.meta.url),
  "utf8",
);
const publishRun = publishWorkflow.match(/        run: \|\n((?:          .*\n|\n)+)/)?.[1];
NodeAssert.ok(publishRun);
const publishScript = publishRun.replace(/^          /gm, "");

function runCheck(
  version: string,
  options: {
    requestExit?: number;
    mainComparison?: string | number;
    publishedComparison?: string | number;
    missingCommit?: "upstream" | "published";
  } = {},
) {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "liverary-upstream-check-"));
  try {
    const result = NodeChildProcess.spawnSync("bash", [], {
      input: `comparison() {
          if [[ "$1" == transport ]]; then
            printf 'connection failed\\n' >&2
            return 1
          fi
          if [[ "$1" =~ ^[0-9]+$ ]]; then
            printf 'HTTP/2.0 %s Fixture error\\nContent-Type: application/json\\r\\n\\r\\n{"message":"Fixture API failure"}\\n' "$1"
            printf 'gh: Fixture API failure (HTTP %s)\\n' "$1" >&2
            return 1
          fi
          printf 'HTTP/2.0 200 OK\\nContent-Type: application/json\\r\\n\\r\\n{"status":"%s"}\\n' "$1"
        }
        gh() {
          case "$*" in
            'api repos/pingdotgg/t3code/releases/latest')
              printf '%s\\n' '{"tag_name":"v0.1.6","draft":false,"prerelease":false,"html_url":"https://example.invalid/upstream"}' ;;
            'api repos/fixture/liverary/commits/main --jq .sha')
              printf '%s\\n' "$FIXTURE_MAIN_SHA" ;;
            'api repos/pingdotgg/t3code/commits/v0.1.6 --jq .sha')
              if [[ "$FIXTURE_MISSING_COMMIT" == upstream ]]; then
                printf 'gh: Not Found (HTTP 404)\\n' >&2
                return 1
              fi
              printf '%s\\n' "$FIXTURE_UPSTREAM_SHA" ;;
            'api repos/fixture/liverary/commits/v1.2.9 --jq .sha')
              if [[ "$FIXTURE_MISSING_COMMIT" == published ]]; then
                printf 'gh: Not Found (HTTP 404)\\n' >&2
                return 1
              fi
              printf '%s\\n' "$FIXTURE_PUBLISHED_SHA" ;;
            "api --include repos/fixture/liverary/compare/$FIXTURE_UPSTREAM_SHA...$FIXTURE_MAIN_SHA?per_page=1")
              comparison "$FIXTURE_MAIN_COMPARISON" ;;
            "api --include repos/fixture/liverary/compare/$FIXTURE_UPSTREAM_SHA...$FIXTURE_PUBLISHED_SHA?per_page=1")
              comparison "$FIXTURE_PUBLISHED_COMPARISON" ;;
            'api repos/fixture/liverary/releases/latest')
              printf '%s\\n' '{"tag_name":"v1.2.9","draft":false,"prerelease":false}' ;;
            api*repos/fixture/liverary/contents/.github/liverary-release.json?ref="$FIXTURE_MAIN_SHA")
              printf '%s\\n' "$FIXTURE_REQUEST"
              return "$FIXTURE_REQUEST_EXIT" ;;
            'api --paginate repos/fixture/liverary/issues?state=all&per_page=100')
              printf '%s\\n' '[{"number":7,"state":"open","user":{"login":"github-actions[bot]"},"body":"<!-- liverary-upstream-update -->","title":"Previous check"}]' ;;
            'issue '*) printf '%s\\n' "$*" >> "$RUNNER_TEMP/mutations" ;;
            *) printf 'Unexpected gh call: %s\\n' "$*" >&2; return 64 ;;
          esac
        }
        ${script}`,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        RUNNER_TEMP: directory,
        GITHUB_STEP_SUMMARY: NodePath.join(directory, "summary"),
        GITHUB_SERVER_URL: "https://github.com",
        GITHUB_REPOSITORY_OWNER: "fixture",
        GITHUB_RUN_ID: "42",
        GH_REPO: "fixture/liverary",
        FIXTURE_MAIN_SHA: mainSha,
        FIXTURE_UPSTREAM_SHA: upstreamSha,
        FIXTURE_PUBLISHED_SHA: publishedSha,
        FIXTURE_MAIN_COMPARISON: String(options.mainComparison ?? "ahead"),
        FIXTURE_PUBLISHED_COMPARISON: String(options.publishedComparison ?? "ahead"),
        FIXTURE_MISSING_COMMIT: options.missingCommit ?? "",
        FIXTURE_REQUEST: JSON.stringify({
          version,
          changes: "수정 사항",
          base_sha: mainSha,
          upstream_sha: upstreamSha,
          upstream_tag: "v0.1.6",
        }),
        FIXTURE_REQUEST_EXIT: String(options.requestExit ?? 0),
      },
    });
    NodeAssert.ifError(result.error);
    const mutations = NodePath.join(directory, "mutations");
    const summary = NodePath.join(directory, "summary");
    return {
      ...result,
      mutations: NodeFS.existsSync(mutations) ? NodeFS.readFileSync(mutations, "utf8") : "",
      summary: NodeFS.existsSync(summary) ? NodeFS.readFileSync(summary, "utf8") : "",
    };
  } finally {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
}

it.each([
  ["1.2.10", "ahead", "ahead", true, true],
  ["1.3.0", "ahead", "ahead", true, true],
  ["2.0.0", "ahead", "ahead", true, true],
  ["1.2.9", 404, 404, false, false],
  ["1.2.9", "ahead", 404, true, false],
  ["1.2.9", "behind", "behind", false, false],
  ["1.2.9", "diverged", "diverged", false, false],
] as const)(
  "keeps the issue open for request %s with main %s and published %s",
  (version, mainComparison, publishedComparison, integrated, published) => {
    const result = runCheck(version, { mainComparison, publishedComparison });
    NodeAssert.equal(result.status, 0, result.stderr);
    NodeAssert.match(result.mutations, /^issue edit 7 /m);
    NodeAssert.doesNotMatch(result.mutations, /^issue close /m);
    NodeAssert.ok(result.summary.includes(`main 통합 여부: \`${integrated}\``));
    NodeAssert.ok(result.summary.includes(`설치 파일 발행 여부: \`${published}\``));
  },
);

it.each([
  ["push", upstreamSha, false, true],
  ["workflow_dispatch", upstreamSha, false, true],
  ["push", mainSha, false, false],
  ["workflow_dispatch", mainSha, false, false],
  ["push", upstreamSha, true, false],
] as const)(
  "validates the source-pinned upstream before release (%s, %s, prerelease=%s)",
  (eventName, tagSha, prerelease, succeeds) => {
    const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "liverary-release-check-"));
    try {
      const output = NodePath.join(directory, "output");
      const result = NodeChildProcess.spawnSync("bash", [], {
        input: `cat() {
            if [[ "$*" == /proc/sys/kernel/random/uuid ]]; then
              printf '12345678-1234-1234-1234-123456789abc\\n'
            else
              command cat "$@"
            fi
          }
          git() {
            case "$*" in
              'init .'|'remote add origin https://github.com/fixture/liverary.git'|fetch*) return 0 ;;
              diff*) return 1 ;;
              "cat-file blob $SOURCE_SHA:.github/liverary-release.json") printf '%s\\n' "$FIXTURE_MANIFEST" ;;
              *) printf 'Unexpected git call: %s\\n' "$*" >&2; return 64 ;;
            esac
          }
          gh() {
            case "$*" in
              'api repos/pingdotgg/t3code/releases/tags/v0.1.6') printf '%s\\n' "$FIXTURE_RELEASE" ;;
              'api repos/pingdotgg/t3code/commits/v0.1.6 --jq .sha') printf '%s\\n' "$FIXTURE_TAG_SHA" ;;
              "api repos/fixture/liverary/compare/$FIXTURE_BASE_SHA...$SOURCE_SHA?per_page=1")
                printf '{"status":"ahead","base_commit":{"sha":"%s"}}\\n' "$FIXTURE_BASE_SHA" ;;
              "api repos/fixture/liverary/compare/$FIXTURE_UPSTREAM_SHA...$SOURCE_SHA?per_page=1")
                printf '{"status":"ahead","base_commit":{"sha":"%s"}}\\n' "$FIXTURE_UPSTREAM_SHA" ;;
              *) printf 'Unexpected gh call: %s\\n' "$*" >&2; return 64 ;;
            esac
          }
          ${releaseScript}`,
        encoding: "utf8",
        cwd: directory,
        env: {
          PATH: process.env.PATH,
          RUNNER_TEMP: directory,
          GITHUB_OUTPUT: output,
          GITHUB_STEP_SUMMARY: NodePath.join(directory, "summary"),
          GITHUB_SERVER_URL: "https://github.com",
          GITHUB_REPOSITORY: "fixture/liverary",
          GITHUB_REF: "refs/heads/main",
          GH_REPO: "fixture/liverary",
          EVENT_NAME: eventName,
          SOURCE_SHA: mainSha,
          BEFORE_SHA: publishedSha,
          INPUT_VERSION: "9.8.7",
          INPUT_CHANGES: "수동 배포",
          INPUT_PUBLISH: "true",
          INPUT_EXPECTED_SHA: mainSha,
          INPUT_BASE_SHA: publishedSha,
          FIXTURE_BASE_SHA: publishedSha,
          FIXTURE_UPSTREAM_SHA: upstreamSha,
          FIXTURE_TAG_SHA: tagSha,
          FIXTURE_RELEASE: JSON.stringify({ tag_name: "v0.1.6", draft: false, prerelease }),
          FIXTURE_MANIFEST: JSON.stringify({
            version: "1.2.10",
            changes: "변경 사항",
            base_sha: publishedSha,
            upstream_sha: upstreamSha,
            upstream_tag: "v0.1.6",
          }),
        },
      });
      NodeAssert.ifError(result.error);
      const outputs = NodeFS.readFileSync(output, "utf8");
      if (succeeds) {
        NodeAssert.equal(result.status, 0, result.stderr);
        NodeAssert.match(outputs, /^should_release=true$/m);
        NodeAssert.ok(outputs.includes(`version=${eventName === "push" ? "1.2.10" : "9.8.7"}\n`));
        NodeAssert.ok(outputs.includes(`upstream_sha=${upstreamSha}\n`));
      } else {
        NodeAssert.notEqual(result.status, 0);
        NodeAssert.doesNotMatch(outputs, /^should_release=true$/m);
      }
    } finally {
      NodeFS.rmSync(directory, { recursive: true, force: true });
    }
  },
);

it.each([
  ["1.2.9", "ahead"],
  ["1.2.8", "identical"],
] as const)(
  "closes the issue when release request %s has been fulfilled (%s)",
  (version, comparison) => {
    const result = runCheck(version, {
      mainComparison: comparison,
      publishedComparison: comparison,
    });
    NodeAssert.equal(result.status, 0, result.stderr);
    NodeAssert.match(result.mutations, /^issue close 7 --reason completed$/m);
  },
);

it.each([
  ["empty", "1.0.0", true],
  ["prerelease", "1.0.0", true],
  ["stable", "1.2.10", true],
  ["stable", "1.2.9", false],
  ["stable", "1.0.0", false],
  ["draft", "1.0.0", true],
  ["different-draft", "1.0.0", false],
  ["existing-tag", "1.0.0", false],
  ["unavailable", "1.0.0", false],
] as const)(
  "validates publication against %s releases for version %s",
  (fixture, version, succeeds) => {
    const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "liverary-publish-check-"));
    try {
      const output = NodePath.join(directory, "output");
      const result = NodeChildProcess.spawnSync("bash", [], {
        input: `gh() {
            case "$*" in
              "api repos/fixture/liverary/actions/runs/42")
                printf '%s\\n' '{"repository":{"full_name":"fixture/liverary"},"head_repository":{"full_name":"fixture/liverary"},"head_branch":"main","path":".github/workflows/release.yml","status":"completed","conclusion":"success","head_sha":"${mainSha}"}' ;;
              "api --paginate repos/fixture/liverary/actions/runs/42/artifacts?per_page=100")
                printf '{"artifacts":[{"name":"liverary-release-metadata","expired":false},{"name":"liverary-%s","expired":false}]}\\n' "$FIXTURE_VERSION" ;;
              'run download 42 --name liverary-release-metadata --dir '*)
                mkdir -p "$RUNNER_TEMP/liverary-release-metadata"
                printf '{"sha":"${mainSha}","version":"%s","changes":"수정 사항","publish":true,"upstream_sha":"${upstreamSha}"}\\n' "$FIXTURE_VERSION" > "$RUNNER_TEMP/liverary-release-metadata/release.json" ;;
              "api repos/fixture/liverary/releases/latest --jq .tag_name")
                if [[ "$FIXTURE_STATE" != stable ]]; then
                  printf 'gh: Not Found (HTTP 404)\\n' >&2
                  return 1
                fi
                printf 'v1.2.9\\n' ;;
              "api --paginate repos/fixture/liverary/releases?per_page=100")
                if [[ "$FIXTURE_STATE" == unavailable ]]; then
                  printf 'gh: Forbidden (HTTP 403)\\n' >&2
                  return 1
                fi
                printf '%s\\n' "$FIXTURE_RELEASES" ;;
              'api repos/fixture/liverary/git/matching-refs/tags/'*)
                if [[ "$FIXTURE_STATE" == draft || "$FIXTURE_STATE" == existing-tag ]]; then
                  printf '1\\n'
                else
                  printf '0\\n'
                fi ;;
              'api repos/fixture/liverary/commits/'*) printf '%s\\n' '${mainSha}' ;;
              *) printf 'Unexpected gh call: %s\\n' "$*" >&2; return 64 ;;
            esac
          }
          ${publishScript}`,
        encoding: "utf8",
        cwd: directory,
        env: {
          PATH: process.env.PATH,
          RUNNER_TEMP: directory,
          GITHUB_OUTPUT: output,
          GITHUB_ENV: NodePath.join(directory, "env"),
          GITHUB_STEP_SUMMARY: NodePath.join(directory, "summary"),
          GH_REPO: "fixture/liverary",
          BUILD_RUN_ID: "42",
          RELEASE_VERSION: version,
          RELEASE_CHANGES: "수정 사항",
          EVENT_NAME: "workflow_run",
          FIXTURE_STATE: fixture,
          FIXTURE_VERSION: version,
          FIXTURE_RELEASES: JSON.stringify(
            fixture === "stable"
              ? [{ tag_name: "v1.2.9", draft: false, prerelease: false }]
              : fixture === "prerelease"
                ? [{ tag_name: "v0.9.0", draft: false, prerelease: true }]
                : fixture === "draft" || fixture === "different-draft"
                  ? [
                      {
                        tag_name: `v${version}`,
                        draft: true,
                        prerelease: false,
                        target_commitish: fixture === "draft" ? mainSha : publishedSha,
                        body: "<!-- liverary-build:42 -->",
                      },
                    ]
                  : [],
          ),
        },
      });
      NodeAssert.ifError(result.error);
      const outputs = NodeFS.readFileSync(output, "utf8");
      if (succeeds) {
        NodeAssert.equal(result.status, 0, result.stderr);
        NodeAssert.match(outputs, /^publish=true$/m);
        NodeAssert.ok(outputs.includes(`resume_draft=${fixture === "draft"}\n`));
      } else {
        NodeAssert.notEqual(result.status, 0);
        NodeAssert.doesNotMatch(outputs, /^publish=true$/m);
      }
    } finally {
      NodeFS.rmSync(directory, { recursive: true, force: true });
    }
  },
);

it.each([
  ["1.2.9-nightly", {}],
  ["1.2.9", { requestExit: 1 }],
  ["1.2.9", { mainComparison: 401 }],
  ["1.2.9", { publishedComparison: 500 }],
  ["1.2.9", { mainComparison: "transport" }],
  ["1.2.9", { publishedComparison: "unexpected" }],
  ["1.2.9", { missingCommit: "upstream" }],
  ["1.2.9", { missingCommit: "published" }],
] as const)(
  "does not change the issue after invalid or unavailable release data (%s, %j)",
  (version, options) => {
    const result = runCheck(version, options);
    NodeAssert.notEqual(result.status, 0);
    NodeAssert.equal(result.mutations, "");
  },
);
