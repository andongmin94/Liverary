import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { render } from "../../test/render";
import { DiffFilePathCopyButton } from "./DiffFilePathCopyButton";
import { AnchoredToastProvider } from "./ui/toast";

it("explains a denied clipboard write and lets the same path be copied again", async () => {
  await using screen = await render(
    <AnchoredToastProvider timeout={0}>
      <DiffFilePathCopyButton filePath="apps/web/src/index.ts" />
    </AnchoredToastProvider>,
  );
  using write = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockRejectedValueOnce(new DOMException("Clipboard access denied", "NotAllowedError"))
    .mockResolvedValue(undefined);
  using _console = vi.spyOn(console, "error").mockImplementation(() => undefined);

  const copy = screen.getByRole("button", { name: "파일 경로 복사" });
  await copy.click();

  await expect.element(page.getByText("클립보드에 복사하지 못했습니다 (text).")).toBeVisible();
  await page.getByRole("button", { name: "알림 닫기" }).click();
  await copy.click();

  await expect.element(page.getByText("복사했습니다!", { exact: true })).toBeVisible();
  expect(write).toHaveBeenCalledTimes(2);
  expect(write).toHaveBeenLastCalledWith("apps/web/src/index.ts");
});
