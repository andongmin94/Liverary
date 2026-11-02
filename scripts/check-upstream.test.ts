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

function runCheck(version: string, requestExit = 0) {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "liverary-upstream-check-"));
  try {
    const result = NodeChildProcess.spawnSync(
      "bash",
      [
        "-c",
        `gh() {
          case "$*" in
            'api repos/pingdotgg/t3code/releases/latest')
              printf '%s\\n' '{"tag_name":"v0.1.6","draft":false,"prerelease":false,"html_url":"https://example.invalid/upstream"}' ;;
            'api repos/fixture/liverary/commits/main --jq .sha')
              printf '%s\\n' "$FIXTURE_MAIN_SHA" ;;
            "api repos/pingdotgg/t3code/compare/v0.1.6...fixture:$FIXTURE_MAIN_SHA?per_page=1"|'api repos/pingdotgg/t3code/compare/v0.1.6...fixture:v1.2.9?per_page=1')
              printf '%s\\n' '{"status":"ahead","base_commit":{"sha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}}' ;;
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
          FIXTURE_REQUEST: JSON.stringify({
            version,
            changes: "수정 사항",
            base_sha: mainSha,
            upstream_sha: "b".repeat(40),
          }),
          FIXTURE_REQUEST_EXIT: String(requestExit),
        },
      },
    );
    NodeAssert.ifError(result.error);
    const mutations = NodePath.join(directory, "mutations");
    return {
      ...result,
      mutations: NodeFS.existsSync(mutations) ? NodeFS.readFileSync(mutations, "utf8") : "",
    };
  } finally {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
}

it.each(["1.2.10", "1.3.0", "2.0.0"])(
  "keeps the issue open while release %s is unpublished",
  (version) => {
    const result = runCheck(version);
    NodeAssert.equal(result.status, 0, result.stderr);
    NodeAssert.match(result.mutations, /^issue edit 7 /m);
    NodeAssert.doesNotMatch(result.mutations, /^issue close /m);
  },
);

it.each(["1.2.9", "1.2.8"])(
  "closes the issue when release request %s has been fulfilled",
  (version) => {
    const result = runCheck(version);
    NodeAssert.equal(result.status, 0, result.stderr);
    NodeAssert.match(result.mutations, /^issue close 7 --reason completed$/m);
  },
);

it.each([
  ["1.2.9-nightly", 0],
  ["1.2.9", 1],
] as const)(
  "does not complete the issue after an invalid or unavailable request (%s, %s)",
  (version, requestExit) => {
    const result = runCheck(version, requestExit);
    NodeAssert.notEqual(result.status, 0);
    NodeAssert.equal(result.mutations, "");
  },
);
