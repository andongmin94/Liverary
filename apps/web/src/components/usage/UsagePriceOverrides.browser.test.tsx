import { describe, expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { render } from "../../../test/render";

const ENVIRONMENT_ID = vi.hoisted(() => "workstation");

vi.mock(import("~/state/presentation"), async (original) => {
  const { Atom } = await import("effect/reactivity");
  const actual = await original();
  const presentation = {
    entry: { target: { label: "workstation" } },
    connection: { phase: "connected" },
    serverConfig: {
      environment: { capabilities: { usagePriceOverrides: true, usageModelAliases: true } },
    },
  };
  return {
    ...actual,
    environmentPresentations: {
      ...actual.environmentPresentations,
      presentationsAtom: Atom.make(new Map([[ENVIRONMENT_ID, presentation]])) as never,
    },
  };
});
vi.mock(import("~/state/server"), async (original) => {
  const { Atom } = await import("effect/reactivity");
  const actual = await original();
  const settings = Atom.make({
    usagePriceOverrides: {
      "priced-model": { inputCostPerMillionTokens: 1, outputCostPerMillionTokens: 4 },
    },
    usageModelAliases: { "my-preview": "gpt-4o" },
  });
  return {
    ...actual,
    serverEnvironment: {
      ...actual.serverEnvironment,
      settingsValueAtom: (() => settings) as never,
    },
  };
});
vi.mock(import("~/state/session"), async (original) => {
  const { AsyncResult, Atom } = await import("effect/reactivity");
  const actual = await original();
  const session = Atom.make(
    AsyncResult.success({ authenticated: true, scopes: ["settings:write"] }),
  );
  return {
    ...actual,
    environmentSession: {
      ...actual.environmentSession,
      sessionStateAtom: (() => session) as never,
    },
  };
});
vi.mock(import("~/state/use-atom-command"), async (original) => ({
  ...(await original()),
  useAtomCommand: (() => vi.fn()) as never,
}));

import { UsagePriceOverrides } from "./UsagePriceOverrides";

const renderPrices = (initialModel?: string) =>
  render(
    <UsagePriceOverrides
      usage={[]}
      initialSelectedEnvironmentIds={null}
      initialModel={initialModel}
      onOpenChange={() => {}}
    />,
  );

describe("UsagePriceOverrides", () => {
  it("waits for a price before flagging an unpriced model's new row", async () => {
    await using _screen = await renderPrices("glm-5.3");
    const modelId = page.getByLabelText("새 모델 ID");
    await expect.element(modelId).toHaveValue("glm-5.3");

    expect(page.getByRole("alert").elements()).toEqual([]);
    await expect.element(modelId).not.toHaveAttribute("aria-invalid");
    await expect.element(page.getByRole("button", { name: "변경 사항 저장" })).toBeDisabled();

    await userEvent.type(page.getByLabelText("glm-5.3의 입력 가격"), "2");
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("workstation에 출력이(가) 필요합니다.");
    await expect.element(page.getByRole("button", { name: "변경 사항 저장" })).toBeDisabled();
  });

  it("asks for a model ID once a new row maps to a model", async () => {
    await using _screen = await renderPrices();
    await page.getByRole("button", { name: "모델 가격 추가" }).click();
    const modelId = page.getByLabelText("새 모델 ID");
    await expect.element(modelId).toHaveValue("");

    expect(page.getByRole("alert").elements()).toEqual([]);
    await expect.element(modelId).not.toHaveAttribute("aria-invalid");

    await userEvent.type(page.getByLabelText("새 모델을(를) 모델에 매핑"), "gpt-4o");
    await expect.element(page.getByRole("alert")).toHaveTextContent("모델 ID를 입력하세요.");
    await expect.element(modelId).toHaveAttribute("aria-invalid", "true");
    await expect.element(page.getByRole("button", { name: "변경 사항 저장" })).toBeDisabled();
  });

  it("leaves no pending change when a mapping goes back to its saved model", async () => {
    await using _screen = await renderPrices();
    const mapTo = page.getByLabelText("my-preview을(를) 모델에 매핑");
    await userEvent.clear(mapTo);
    await userEvent.type(page.getByLabelText("my-preview의 입력 가격"), "2");
    await userEvent.type(mapTo, "gpt-4o");

    await expect
      .element(page.getByRole("button", { name: "변경 사항 취소" }))
      .not.toBeInTheDocument();
    expect(page.getByRole("alert").elements()).toEqual([]);
    await expect.element(page.getByRole("button", { name: "적용 대상 모든 환경" })).toBeEnabled();
  });

  it("keeps typed prices when a priced model's new mapping is cleared", async () => {
    await using _screen = await renderPrices();
    const input = page.getByLabelText("priced-model의 입력 가격");
    await userEvent.clear(input);
    await userEvent.type(input, "2");
    const mapTo = page.getByLabelText("priced-model을(를) 모델에 매핑");
    await userEvent.type(mapTo, "gpt-4o");
    await userEvent.clear(mapTo);

    await expect.element(input).toHaveValue("2");
    await expect.element(page.getByRole("button", { name: "변경 사항 저장" })).toBeEnabled();
  });
});
