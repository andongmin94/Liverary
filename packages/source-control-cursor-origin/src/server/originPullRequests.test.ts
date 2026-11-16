import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as OriginCli from "./OriginCli.ts";
import * as OriginPullRequestProvider from "./OriginPullRequestProvider.ts";
import { checksState, originCheck, originFilesPatch, pullReference } from "./originPullRequests.ts";

const run = (status: string, conclusion?: string) =>
  originCheck({ name: `${status}-${conclusion ?? ""}`, status, conclusion });

describe("checksState", () => {
  it("rolls up Origin check runs", () => {
    assert.strictEqual(checksState([]), null);
    assert.strictEqual(
      checksState([run("completed", "success"), run("completed", "skipped")]),
      "passing",
    );
    assert.strictEqual(checksState([run("completed", "success"), run("in_progress")]), "pending");
    assert.strictEqual(
      checksState([run("completed", "success"), run("completed", "cancelled")]),
      "failing",
    );
    assert.strictEqual(
      checksState([run("in_progress"), run("completed", "action_required")]),
      "failing",
    );
  });
});

describe("originFilesPatch", () => {
  const header = (file: Parameters<typeof originFilesPatch>[0][number]) =>
    originFilesPatch([file]).split("\n").slice(0, 4);

  it("keeps rename and copy metadata", () => {
    assert.deepStrictEqual(
      header({ filename: "b.ts", previousFilename: "a.ts", status: "renamed" }),
      ["diff --git a/a.ts b/b.ts", "similarity index 100%", "rename from a.ts", "rename to b.ts"],
    );
    // Origin leaves out the hunks of large files, which must not read as a pure rename.
    assert.strictEqual(
      header({ filename: "b.ts", previousFilename: "a.ts", status: "renamed", changes: 4 })[1],
      "similarity index 0%",
    );
    assert.deepStrictEqual(
      header({
        filename: "b.ts",
        previousFilename: "a.ts",
        status: "copied",
        patch: "@@ -1 +1 @@\n-a\n+b",
      }).slice(1),
      ["similarity index 0%", "copy from a.ts", "copy to b.ts"],
    );
  });
});

describe("pullReference", () => {
  it("separates pull request numbers, Origin links, and branches", () => {
    assert.deepStrictEqual(pullReference("42"), { repository: null, number: 42 });
    assert.deepStrictEqual(pullReference(" #42 "), { repository: null, number: 42 });
    assert.deepStrictEqual(pullReference("https://cursor.com/codebase/Acme/Web/pull/7"), {
      repository: "acme/web",
      number: 7,
    });
    for (const branch of ["123/fix", "feature/pull/42", "https://github.com/acme/web/pull/7"])
      assert.deepStrictEqual(pullReference(branch), { repository: null, number: null });
  });
});

it.effect("preserves project paths across Origin's cached reads and write invalidation", () =>
  Effect.gen(function* () {
    for (const cwd of ["/work/repo", "/work/repo\ncopy"]) {
      const reference = { cwd, repository: "acme/web", host: "git.cursor.com", number: 7 };
      const repositoryPath = "/v1/origin/repos/acme/web";
      const pullPath = `${repositoryPath}/pulls/7`;
      const reads: string[] = [];
      let title = "Original title";
      const provider = yield* OriginPullRequestProvider.make.pipe(
        Effect.provide(
          Layer.mock(OriginCli.OriginCli)({
            api: (input, schema) =>
              Effect.sync(() => {
                assert.strictEqual(input.cwd, cwd);
                let body: unknown;
                if (input.method === "PATCH") {
                  assert.strictEqual(input.path, pullPath);
                  assert.deepStrictEqual(input.body, { title: "Updated title" });
                  title = "Updated title";
                  body = {};
                } else {
                  reads.push(input.path);
                  switch (input.path) {
                    case repositoryPath:
                      body = { name: "web", allowMergeCommit: false, allowSquashMerge: true };
                      break;
                    case pullPath:
                      body = {
                        number: 7,
                        title,
                        state: "open",
                        head: { ref: "feature", sha: "head-sha" },
                        base: { ref: "main", sha: "base-sha" },
                        version: { headSha: "head-sha", baseSha: "base-sha" },
                        webUrl: "https://cursor.com/codebase/acme/web/pull/7",
                      };
                      break;
                    case `${repositoryPath}/commits/head-sha/check-runs?pageSize=100`:
                      body = {
                        checkRuns: [{ name: "ci", status: "completed", conclusion: "success" }],
                      };
                      break;
                    case `${repositoryPath}/git/ref/heads%2Fmain`:
                      body = { object: { sha: "base-tip" } };
                      break;
                    case `${pullPath}/mergeability?expectedHeadSha=head-sha`:
                      body = { headSha: "head-sha", verdict: "mergeable" };
                      break;
                    case `${pullPath}/files?pageSize=100`:
                    case `${repositoryPath}/commits/commit-sha/files?pageSize=100`:
                      body = {
                        files: [
                          {
                            filename: "src/a.ts",
                            status: "modified",
                            patch: "@@ -1 +1 @@\n-before\n+after\n",
                          },
                        ],
                      };
                      break;
                    default:
                      assert.fail(`Unexpected Origin request: ${input.path}`);
                  }
                }
                return body;
              }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(schema)), Effect.orDie),
          }),
        ),
      );

      assert.isDefined(provider.getChangeRequestSummary);
      assert.isDefined(provider.getDiff);
      assert.isDefined(provider.updateChangeRequest);
      assert.strictEqual((yield* provider.getChangeRequestSummary(reference)).title, title);
      const detail = yield* provider.getChangeRequest(reference);
      assert.strictEqual(detail.title, title);
      assert.strictEqual(detail.checksState, "passing");
      assert.strictEqual(detail.mergeability, "mergeable");
      assert.deepStrictEqual(detail.mergeCapabilities, {
        merge: false,
        squash: true,
        rebase: false,
      });
      const patch = yield* provider.getDiff(reference);
      assert.include(patch.patch, "diff --git a/src/a.ts b/src/a.ts");
      assert.include(patch.patch, "-before\n+after");
      const commit = { ...reference, commit: "commit-sha" };
      assert.deepStrictEqual(yield* provider.getDiff(commit), patch);

      const afterFirstRead = reads.length;
      assert.strictEqual((yield* provider.getChangeRequestSummary(reference)).title, title);
      assert.deepStrictEqual(yield* provider.getChangeRequest(reference), detail);
      assert.deepStrictEqual(yield* provider.getDiff(reference), patch);
      assert.deepStrictEqual(yield* provider.getDiff(commit), patch);
      assert.strictEqual(reads.length, afterFirstRead);

      yield* provider.updateChangeRequest({ ...reference, title: "Updated title" });
      assert.strictEqual(
        (yield* provider.getChangeRequestSummary(reference)).title,
        "Updated title",
      );
      assert.strictEqual(reads.length, afterFirstRead + 1);
      yield* provider.getChangeRequestSummary(reference);
      assert.strictEqual(reads.length, afterFirstRead + 1);
    }
  }).pipe(Effect.scoped),
);
