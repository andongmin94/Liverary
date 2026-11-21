import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { render } from "../../../test/render";
import { APP_VERSION } from "../../branding";
import { AnchoredToastProvider } from "../ui/toast";
import { AboutVersion } from "./AboutVersion";

it("copies the version without a notification", async () => {
  await using screen = await render(
    <AnchoredToastProvider>
      <AboutVersion />
    </AnchoredToastProvider>,
  );
  using write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

  await screen.getByRole("button", { name: `버전 ${APP_VERSION} 복사` }).click();

  expect(write).toHaveBeenCalledWith(APP_VERSION);
  await expect.element(page.getByText("복사됨!", { exact: true })).not.toBeInTheDocument();
});
