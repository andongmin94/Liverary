import { RegistryProvider } from "@effect/atom-react";
import { describe, expect, it, vi } from "vite-plus/test";
import { page, userEvent, type Locator } from "vite-plus/test/browser";

import { act, render } from "../../../test/render";
import { compileResolvedKeybindingsConfig } from "@t3tools/shared/keybindings";
import * as atomCommands from "../../state/use-atom-command";

vi.mock(import("../../state/session"), async (original) => ({
  ...(await original()),
  useEnvironmentScope: () => true,
  useEnvironmentsWithScope: ((environments: ReadonlyArray<{ environmentId: string }>) =>
    new Set(environments.map(({ environmentId }) => environmentId))) as never,
  readEnvironmentScope: () => true,
}));
vi.mock(import("../../state/use-atom-command"), async (original) => ({
  ...(await original()),
  useAtomCommand: vi.fn(() => vi.fn()) as never,
}));
vi.mock(import("./SettingsScopeContext"), async (original) => ({
  ...(await original()),
  useSettingsScope: (() => {
    const environment = {
      environmentId: "env",
      label: "Build workstation",
      serverConfig: {
        keybindings: compileResolvedKeybindingsConfig([
          { command: "composer.sendBackground", key: "mod+alt+enter", when: "false" },
        ]),
        keybindingsConfigPath: null,
        availableEditors: [],
      },
    };
    return {
      scope: { kind: "environment" },
      environment,
      environments: [environment],
      connectedEnvironments: [environment],
      targets: [],
      target: null,
    };
  }) as never,
}));

import { Dialog, DialogPopup, DialogTitle } from "../ui/dialog";
import { KeybindingsSettingsPanel } from "./KeybindingsSettings";

// The modal dialog's inert layer swallows pointer events in this harness, so drive the DOM.
async function activate(locator: Locator, action: "click" | "focus") {
  await expect.element(locator).toBeVisible();
  (locator.element() as HTMLElement)[action]();
}

const existingField = page.getByRole("textbox", { name: "사이드바: 전환 단축키" });
const existingPill = page.getByRole("button", { name: /^사이드바: 전환 단축키 편집:/ });
const newField = page.getByRole("textbox", { name: "새 단축키의 키 조합" });

describe("Esc in a shortcut recorder", () => {
  it.each<{
    name: string;
    field: Locator;
    open: () => Promise<void>;
    expectReset: () => Promise<void>;
  }>([
    {
      name: "existing binding",
      field: existingField,
      open: () => activate(existingPill, "click"),
      expectReset: async () => {
        await expect.element(existingField).not.toBeInTheDocument();
        await expect.element(existingPill).toHaveFocus();
        await expect.element(page.getByRole("button", { name: "저장" })).not.toBeInTheDocument();
      },
    },
    {
      name: "new binding",
      field: newField,
      open: async () => {
        await activate(page.getByRole("button", { name: "단축키 추가" }), "click");
        await activate(newField, "focus");
      },
      expectReset: async () => {
        await expect.element(newField).toHaveValue("");
        await expect.element(newField).toHaveAttribute("placeholder", "할당되지 않음");
      },
    },
  ])("leaves the $name field without closing Settings", async ({ field, open, expectReset }) => {
    const onOpenChange = vi.fn();
    await using _screen = await render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogPopup>
          <DialogTitle>Settings</DialogTitle>
          <KeybindingsSettingsPanel />
        </DialogPopup>
      </Dialog>,
    );

    await open();
    await userEvent.keyboard("{Control>}k{/Control}");
    await expect.element(field).not.toHaveValue("");
    await userEvent.tab();
    await activate(field, "focus");
    await expect.element(field).toHaveAttribute("placeholder", "단축키 누르기");

    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.activeElement?.matches("[data-keybinding-capture]")).toBe(false);
    await expectReset();

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it.each([
    { name: "existing binding", field: existingField, open: () => activate(existingPill, "click") },
    {
      name: "new binding",
      field: newField,
      open: async () => {
        await activate(page.getByRole("button", { name: "단축키 추가" }), "click");
        await activate(newField, "focus");
      },
    },
  ])("records Shift+Esc in the $name field", async ({ field, open }) => {
    const onOpenChange = vi.fn();
    await using _screen = await render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogPopup>
          <DialogTitle>Settings</DialogTitle>
          <KeybindingsSettingsPanel />
        </DialogPopup>
      </Dialog>,
    );

    await open();
    await userEvent.keyboard("{Shift>}{Escape}{/Shift}");

    await expect.element(field).toHaveValue("shift+esc");
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

it("unassigns a default shortcut and restores its condition when one is assigned again", async () => {
  const mutate = vi.fn(async () => ({ _tag: "Success", value: [] }));
  await vi.mocked(atomCommands.useAtomCommand).withImplementation(
    () => mutate as never,
    async () => {
      await using screen = await render(<KeybindingsSettingsPanel />);

      await screen.getByRole("button", { name: "사이드바: 전환 작업" }).click();
      await screen.getByRole("menuitem", { name: "할당 해제" }).click();
      expect(mutate).toHaveBeenLastCalledWith({
        environmentId: "env",
        input: {
          command: "sidebar.toggle",
          key: "mod+b",
          when: "false",
          replace: { command: "sidebar.toggle", key: "mod+b" },
        },
      });

      const unassigned = screen.getByRole("button", {
        name: "입력창: 백그라운드에서 시작 단축키 편집: 할당되지 않음",
      });
      const save = screen.getByRole("button", { name: "저장" });
      await unassigned.click();
      await userEvent.keyboard("{Control>}{Alt>}j{/Alt}{/Control}");
      await expect.element(save).toBeVisible();
      await userEvent.keyboard("{Escape}");
      await expect.element(save).not.toBeInTheDocument();

      await unassigned.click();
      await userEvent.keyboard("{Control>}{Alt>}j{/Alt}{/Control}");
      await save.click();
      expect(mutate).toHaveBeenLastCalledWith({
        environmentId: "env",
        input: expect.objectContaining({
          command: "composer.sendBackground",
          when: "composerFocus && draftThreadRoute",
          replace: { command: "composer.sendBackground", key: "mod+alt+enter", when: "false" },
        }),
      });
    },
  );
});

it("Esc in the keybindings search clears the query without closing Settings", async () => {
  const onOpenChange = vi.fn();
  await using _screen = await render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>Settings</DialogTitle>
        <KeybindingsSettingsPanel />
      </DialogPopup>
    </Dialog>,
  );
  const search = page.getByRole("searchbox", { name: "단축키 검색" });
  await search.fill("sidebar");
  for (const composition of [
    { key: "Escape", isComposing: true, keyCode: 27 },
    { key: "Escape", isComposing: false, keyCode: 229 },
  ]) {
    const keydown = new KeyboardEvent("keydown", {
      ...composition,
      bubbles: true,
      cancelable: true,
    });
    await act(() => {
      // Safari ends the composition just before the Escape keydown.
      if (!composition.isComposing)
        search.element().dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
      search.element().dispatchEvent(keydown);
    });
    expect(keydown.defaultPrevented).toBe(false);
    await expect.element(search).toHaveValue("sidebar");
    await expect.element(search).toHaveFocus();
  }
  expect(search.element().getAttribute("type")).toBe("text");

  await userEvent.keyboard("{Escape}");
  await expect.element(search).toHaveValue("");
  await expect.element(search).toHaveFocus();

  await act(() =>
    search.element().dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        repeat: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  await expect.element(search).toHaveValue("");
  await expect.element(search).toHaveFocus();
  expect(onOpenChange).not.toHaveBeenCalled();

  await search.fill("sidebar");
  await userEvent.keyboard("{Shift>}{Escape}{/Shift}");
  await expect.element(search).toHaveValue("sidebar");
  await expect.element(search).toHaveFocus();
  expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
});

it("re-enables Save when a When editor closes on an expression it could not parse", async () => {
  await using screen = await render(
    <RegistryProvider>
      <KeybindingsSettingsPanel />
    </RegistryProvider>,
  );
  const whenTrigger = screen.getByRole("button", { name: "터미널: 전환의 when 절 편집" });
  const expression = screen.getByRole("textbox", { name: "When 식" });

  await whenTrigger.click();
  await userEvent.type(expression, "terminalFocus");
  await userEvent.type(expression, " &&");
  await expect.element(screen.getByRole("button", { name: "저장" })).toBeDisabled();

  await userEvent.keyboard("{Escape}");
  await whenTrigger.click();

  await expect.element(expression).toHaveValue("terminalFocus");
  await expect.element(screen.getByRole("button", { name: "저장" })).toBeEnabled();
});

it("filters actions and allows additional shortcuts for assigned commands", async () => {
  await using screen = await render(<KeybindingsSettingsPanel />);
  await screen.getByRole("button", { name: "단축키 추가" }).click();
  const dialog = page.getByRole("dialog", { name: "명령", exact: true });
  const search = dialog.getByRole("combobox", { name: "검색", exact: true });
  await expect.element(search).toHaveFocus();
  await userEvent.keyboard("sidebar.toggle");
  const assigned = page.getByRole("option", { name: /사이드바: 전환/ });
  await expect.element(assigned).not.toHaveAttribute("aria-disabled", "true");
  await expect.element(assigned.element().querySelector("kbd")!).toBeVisible();
  await vi.waitFor(() => expect(page.getByRole("option").elements()).toHaveLength(1));
  await assigned.click();
  const command = screen.getByRole("combobox", { name: "명령", exact: true });
  await expect.element(command).toHaveTextContent("사이드바: 전환");
  await command.click();
  await search.fill("대기열/방향 조정 반대");
  await expect
    .element(page.getByRole("option", { name: /입력창: 대기열\/방향 조정 반대 동작/ }))
    .toBeVisible();
  await vi.waitFor(() => expect(page.getByRole("option").elements()).toHaveLength(1));
  await search.fill("no-such-action");
  await expect.element(page.getByText("결과가 없습니다.")).toBeVisible();
  await search.fill("composer.cycleHost");
  const available = page.getByRole("option", { name: "입력창: 호스트 순환" });
  await expect.element(available).not.toHaveAttribute("aria-disabled", "true");
  await available.click();
  await expect
    .element(screen.getByRole("combobox", { name: "명령", exact: true }))
    .toHaveTextContent("입력창: 호스트 순환");
});
