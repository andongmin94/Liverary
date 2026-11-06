import { describe, expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { useState, type ReactNode } from "react";

import { act, render } from "../../../test/render";
import { ProviderAccentColorPicker } from "./ProviderAccentColorPicker";
import { ThemeColorField } from "./ThemeColorPicker";

const HUE = "강조 색상 색조";
const PLANE = "강조 색상 채도와 밝기";

async function renderPicker(ui: ReactNode) {
  await using stack = new AsyncDisposableStack();
  // Synthetic pointer ids are not active pointers, so the browser would reject capture.
  stack.use(vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(() => {}));
  const screen = stack.use(await render(ui));
  const environment = stack.move();
  return Object.assign(screen, {
    [Symbol.asyncDispose]: () => environment.disposeAsync(),
  });
}

function byLabel<T extends HTMLElement = HTMLElement>(label: string) {
  const element = document.querySelector<T>(`[aria-label="${label}"]`);
  if (!element) throw new Error(`No element labelled ${label}`);
  return element;
}

const slider = (label: string) => byLabel<HTMLInputElement>(label);

async function open(triggerLabel: string, hueLabel = HUE) {
  await userEvent.click(byLabel(triggerLabel));
  await vi.waitFor(() => byLabel(hueLabel));
}

async function press(label: string, key: string, shift = false) {
  const target = slider(label);
  await act(async () => target.focus());
  await userEvent.keyboard(shift ? `{Shift>}{${key}}{/Shift}` : `{${key}}`);
}

function pointer(label: string, type: string, xFraction: number, yFraction = 0.5, pointerId = 1) {
  const target = byLabel(label);
  const bounds = target.getBoundingClientRect();
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      pointerId,
      clientX: bounds.left + bounds.width * xFraction,
      clientY: bounds.top + bounds.height * yFraction,
    }),
  );
}

async function renderThemeField(value: string) {
  const onChange = vi.fn();
  const field = (current: string) => (
    <ThemeColorField role="accent" value={current} onChange={onChange} />
  );
  await using stack = new AsyncDisposableStack();
  const screen = stack.use(await renderPicker(field(value)));
  await open("강조 색상 색상 선택");
  stack.move();
  return Object.assign(screen, {
    onChange,
    echo: (current: string) => screen.rerender(field(current)),
  });
}

function ControlledThemeField() {
  const [value, setValue] = useState("#408080");
  return <ThemeColorField role="accent" value={value} onChange={(_, next) => setValue(next)} />;
}

describe("theme color field", () => {
  it("jumps hue to both endpoints without changing saturation or brightness", async () => {
    await using _screen = await render(<ControlledThemeField />);
    await open("강조 색상 색상 선택");

    await press(HUE, "Home");
    expect(slider(HUE).getAttribute("aria-valuenow")).toBe("0");
    expect(byLabel<HTMLInputElement>("강조 색상 선택기의 HEX 값").value).toBe("#804040");

    await press(HUE, "End");
    expect(slider(HUE).getAttribute("aria-valuenow")).toBe("360");
    expect(byLabel<HTMLInputElement>("강조 색상 선택기의 HEX 값").value).toBe("#804040");

    await press(HUE, "ArrowRight", true);
    expect(slider(HUE).getAttribute("aria-valuenow")).toBe("10");
    expect(byLabel<HTMLInputElement>("강조 색상 선택기의 HEX 값").value).toBe("#804b40");
  });

  it("keeps the selected hue when a grey color is echoed back from theme settings", async () => {
    await using screen = await renderThemeField("#ff0000");
    const { onChange, echo } = screen;

    await press(HUE, "ArrowRight", true);
    await act(async () => {
      pointer(PLANE, "pointerdown", 0, 0);
      pointer(PLANE, "pointerup", 0, 0);
    });
    expect(onChange).toHaveBeenLastCalledWith("accent", "#ffffff");

    await echo("#ffffff");
    expect(slider(HUE).getAttribute("aria-valuenow")).toBe("10");
  });

  it("keeps a translucent color's alpha when a hex value is typed", async () => {
    await using screen = await renderThemeField("#22ccff80");
    const { onChange } = screen;

    await userEvent.fill(byLabel("강조 색상 선택기의 HEX 값"), "#ff0000");
    expect(onChange).toHaveBeenLastCalledWith("accent", "#ff000080");
  });
});

async function renderAccentPicker(value: string) {
  const onCommit = vi.fn();
  const picker = (current: string) => (
    <ProviderAccentColorPicker displayName="Codex" value={current} onCommit={onCommit} />
  );
  await using stack = new AsyncDisposableStack();
  const screen = stack.use(await renderPicker(picker(value)));
  await open("Codex 강조 색상 변경", "강조 색상 색조");
  stack.move();
  return Object.assign(screen, {
    onCommit,
    echo: (current: string) => screen.rerender(picker(current)),
  });
}

describe("provider accent color picker", () => {
  it("leaves the optional color unset when the preview is dismissed", async () => {
    const onCommit = vi.fn();
    await using _screen = await renderPicker(
      <ProviderAccentColorPicker
        displayName="Example provider"
        value={undefined}
        onCommit={onCommit}
      />,
    );

    await open("Example provider 강조 색상 추가", "강조 색상 색조");
    expect(byLabel<HTMLInputElement>("강조 색상의 HEX 값").value).toBe("#2563eb");
    expect(onCommit).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("adds the displayed default without adjusting a color control", async () => {
    const onCommit = vi.fn();
    await using screen = await renderPicker(
      <ProviderAccentColorPicker
        displayName="Example provider"
        value={undefined}
        onCommit={onCommit}
      />,
    );

    await open("Example provider 강조 색상 추가", "강조 색상 색조");
    await userEvent.click(page.getByRole("button", { name: "색상 추가", exact: true }));

    expect(onCommit).toHaveBeenCalledExactlyOnceWith("#2563eb");
    await expect
      .element(screen.getByRole("button", { name: "Example provider 강조 색상 변경" }))
      .toBeVisible();
    await vi.waitFor(() =>
      expect(document.querySelector('[aria-label="강조 색상의 HEX 값"]')).toBeNull(),
    );
  });

  it("lets keyboard users add the displayed default", async () => {
    const onCommit = vi.fn();
    await using screen = await renderPicker(
      <ProviderAccentColorPicker
        displayName="Example provider"
        value={undefined}
        onCommit={onCommit}
      />,
    );

    await open("Example provider 강조 색상 추가", "강조 색상 색조");
    await act(async () => byLabel("강조 색상 채도").focus());
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    expect(onCommit).toHaveBeenCalledExactlyOnceWith("#2563eb");
    await expect
      .element(screen.getByRole("button", { name: "Example provider 강조 색상 변경" }))
      .toBeVisible();
  });

  it("keeps live color editing and allows clearing back to unset", async () => {
    const onCommit = vi.fn();
    await using screen = await renderPicker(
      <ProviderAccentColorPicker
        displayName="Example provider"
        value="#ff0000"
        onCommit={onCommit}
      />,
    );

    await open("Example provider 강조 색상 변경", "강조 색상 색조");
    await press("강조 색상 색조", "ArrowRight", true);
    expect(onCommit).toHaveBeenLastCalledWith("#ff2a00");
    await userEvent.click(page.getByRole("button", { name: "색상 지우기", exact: true }));
    expect(onCommit).toHaveBeenLastCalledWith("");
    await expect
      .element(screen.getByRole("button", { name: "Example provider 강조 색상 추가" }))
      .toBeVisible();
  });

  it("commits a drag that is still in progress when the popover closes", async () => {
    await using screen = await renderAccentPicker("#ff0000");

    await act(async () => {
      pointer("강조 색상 색조", "pointerdown", 0.5);
      pointer("강조 색상 색조", "pointermove", 0.5);
    });
    expect(screen.onCommit).not.toHaveBeenCalled();

    await userEvent.keyboard("{Escape}");
    expect(screen.onCommit).toHaveBeenCalledTimes(1);
    expect(screen.onCommit.mock.calls[0]?.[0]).not.toBe("#ff0000");
  });

  it("saves a change back to the saved color while the first change is still saving", async () => {
    await using screen = await renderAccentPicker("#ff0000");

    await userEvent.fill(byLabel("강조 색상의 HEX 값"), "#00ff00");
    await userEvent.fill(byLabel("강조 색상의 HEX 값"), "#ff0000");

    expect(screen.onCommit).toHaveBeenLastCalledWith("#ff0000");
    await userEvent.fill(byLabel("강조 색상의 HEX 값"), "#00FF00");
    await screen.echo("#00FF00");
    expect(byLabel<HTMLInputElement>("강조 색상의 HEX 값").value).toBe("#00FF00");
  });

  it("shows the saved color again when it is reverted outside the picker", async () => {
    await using screen = await renderAccentPicker("#ff0000");

    await userEvent.fill(byLabel("강조 색상의 HEX 값"), "#00ff00");
    expect(screen.onCommit).toHaveBeenLastCalledWith("#00ff00");
    await screen.echo("#00ff00");
    await screen.echo("#ff0000");

    expect(byLabel<HTMLInputElement>("강조 색상의 HEX 값").value).toBe("#ff0000");
    await screen.echo("");
    expect(byLabel<HTMLInputElement>("강조 색상의 HEX 값").value).toBe("#2563eb");
    await userEvent.click(page.getByRole("button", { name: "색상 추가", exact: true }));
    expect(screen.onCommit).toHaveBeenLastCalledWith("#2563eb");

    expect(byLabel("Codex 강조 색상 변경").style.backgroundColor).toBe("rgb(37, 99, 235)");
  });
});
