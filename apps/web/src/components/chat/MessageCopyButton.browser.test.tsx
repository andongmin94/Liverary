import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { render } from "../../../test/render";
import { AnchoredToastProvider } from "../ui/toast";
import { MessageCopyButton } from "./MessageCopyButton";

it("explains a denied clipboard write and lets the same message be copied again", async () => {
  await using screen = await render(
    <AnchoredToastProvider timeout={0}>
      <MessageCopyButton text="A message to copy" />
    </AnchoredToastProvider>,
  );
  using _write = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockRejectedValueOnce(new DOMException("Clipboard access denied", "NotAllowedError"))
    .mockResolvedValue(undefined);
  using _console = vi.spyOn(console, "error").mockImplementation(() => undefined);

  const copy = screen.getByRole("button", { name: "메시지 복사" });
  await copy.click();

  await expect.element(page.getByText("클립보드에 복사하지 못했습니다 (text).")).toBeVisible();
  await expect.element(copy).toBeEnabled();
  await page.getByRole("button", { name: "알림 닫기" }).click();
  await copy.click();

  await expect.element(page.getByText("복사했습니다!", { exact: true })).toBeVisible();
  await expect.element(copy).toBeDisabled();
});
