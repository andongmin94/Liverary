import { beforeEach, describe, expect, it } from "vite-plus/test";
import { EnvironmentId, ProjectId } from "@t3tools/contracts";

import {
  type PendingReviewComment,
  pullRequestReviewKey,
  usePullRequestReviewStore,
} from "./pullRequestReviewStore";

function comment(id: string, body = id): PendingReviewComment {
  return { id, body, path: "src/app.ts", position: { kind: "added", newLine: 1 } };
}

describe("pull request review drafts", () => {
  beforeEach(() => {
    usePullRequestReviewStore.setState({ drafts: {}, summaries: {} });
  });

  it("removes only the line comments included in a submitted snapshot", () => {
    const store = usePullRequestReviewStore.getState();
    store.addComment("review-a", comment("submitted"));
    const submittedIds =
      usePullRequestReviewStore.getState().drafts["review-a"]?.map((entry) => entry.id) ?? [];

    usePullRequestReviewStore.getState().addComment("review-a", comment("added-in-flight"));
    usePullRequestReviewStore.getState().removeComments("review-a", submittedIds);

    expect(usePullRequestReviewStore.getState().drafts["review-a"]).toEqual([
      comment("added-in-flight"),
    ]);
  });

  it("keeps drafts on different hosts and environments separate for the same project and pull request", () => {
    const environmentId = EnvironmentId.make("environment-a");
    const otherEnvironmentId = EnvironmentId.make("environment-b");
    const reference = {
      projectId: ProjectId.make("project-a"),
      repository: "owner/repo",
      number: 7,
    };
    const publicKey = pullRequestReviewKey({ ...reference, host: "github.com" }, environmentId);
    const enterpriseKey = pullRequestReviewKey(
      { ...reference, host: "github.example.com" },
      environmentId,
    );
    const otherEnvironmentKey = pullRequestReviewKey(
      { ...reference, host: "github.com" },
      otherEnvironmentId,
    );
    const store = usePullRequestReviewStore.getState();
    store.addComment(publicKey, comment("public"));
    store.setSummary(publicKey, "Public review");

    expect(usePullRequestReviewStore.getState().drafts[enterpriseKey]).toBeUndefined();
    expect(usePullRequestReviewStore.getState().summaries[enterpriseKey]).toBeUndefined();
    expect(usePullRequestReviewStore.getState().drafts[otherEnvironmentKey]).toBeUndefined();
    expect(usePullRequestReviewStore.getState().summaries[otherEnvironmentKey]).toBeUndefined();

    store.addComment(enterpriseKey, comment("enterprise"));
    store.setSummary(enterpriseKey, "Enterprise review");
    store.clear(enterpriseKey);
    store.clearSummary(enterpriseKey, "Enterprise review");

    store.addComment(otherEnvironmentKey, comment("other-environment-submitted"));
    store.setSummary(otherEnvironmentKey, "Other environment review");
    store.removeComments(otherEnvironmentKey, ["other-environment-submitted"]);
    store.clearSummary(otherEnvironmentKey, "Other environment review");
    store.addComment(otherEnvironmentKey, comment("other-environment-discarded"));
    store.clear(otherEnvironmentKey);

    expect(usePullRequestReviewStore.getState().drafts[publicKey]).toEqual([comment("public")]);
    expect(usePullRequestReviewStore.getState().summaries[publicKey]).toBe("Public review");
  });

  it("does not clear a summary revised while submission is in flight", () => {
    const store = usePullRequestReviewStore.getState();
    store.setSummary("review-a", "Submitted body");
    usePullRequestReviewStore.getState().setSummary("review-a", "Revised body");
    usePullRequestReviewStore.getState().clearSummary("review-a", "Submitted body");

    expect(usePullRequestReviewStore.getState().summaries["review-a"]).toBe("Revised body");
  });
});
