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
    const result = NodeChildProcess.spawnSync(
      "bash",
      [
        "-c",
        `comparison() {
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
      ],
      {
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
          }),
          FIXTURE_REQUEST_EXIT: String(options.requestExit ?? 0),
        },
      },
    );
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
