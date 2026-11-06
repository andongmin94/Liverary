import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

const state = vi.hoisted(() => ({ detail: "" }));

vi.mock(import("~/state/use-atom-command"), async () => {
  const { PullRequestOperationError } = await import("@t3tools/contracts");
  const { Cause } = await import("effect");
  const { AsyncResult } = await import("effect/reactivity");
  return {
    useAtomCommand: (() => async () =>
      AsyncResult.failure(
        Cause.fail(new PullRequestOperationError({ operation: "runAction", detail: state.detail })),
      )) as never,
  };
});

import "~/index.css";
import { render } from "../../../test/render";
import { ToastProvider } from "../ui/toast";
import { PullRequestStackMenu } from "./PullRequestStackMenu";

function setup(detail: string) {
  state.detail = detail;
}

const HEAD_MOVED = "The stack head moved. Refresh the stack before trying again.";

it.each([
  { label: "스택 병합", detail: HEAD_MOVED, description: HEAD_MOVED },
  { label: "스택 리베이스", detail: HEAD_MOVED, description: HEAD_MOVED },
  {
    label: "스택 리베이스",
    detail: "GitHub CLI command failed.",
    description:
      "호스트가 리베이스를 거부했습니다. 리베이스는 충돌이 발생한 첫 번째 커밋에서 중단됩니다.",
  },
])("$label refused with $detail shows $description", async (row) => {
  setup(row.detail);
  await using screen = await render(
    <ToastProvider>
      <PullRequestStackMenu
        environmentId={EnvironmentId.make("environment")}
        reference={{
          projectId: ProjectId.make("project"),
          repository: "owner/repository",
          number: 2,
        }}
        hostLabel="GitHub"
        terminology={sourceControlClients.get("github").changeRequest}
        stack={{
          id: "stack",
          number: 1,
          url: "https://github.com/owner/repository/stack/1",
          base: "main",
          layers: [{ number: 2, headBranch: "feature", headSha: "abc123", state: "open" }],
        }}
        canMerge
        stale={false}
        canRebase
        mergeMethod="squash"
        onActed={() => {}}
      />
    </ToastProvider>,
  );
  if (row.label === "스택 리베이스") {
    await screen.getByRole("button", { name: "스택 1, 계층 1 / 1" }).click();
    await page.getByRole("menuitem", { name: row.label }).click();
  } else {
    await screen.getByRole("button", { name: row.label, exact: true }).click();
  }
  await page.getByRole("dialog").getByRole("button", { name: row.label, exact: true }).click();
  await expect.element(page.getByText(row.description, { exact: true })).toBeInTheDocument();
});
