import { assert, it } from "@effect/vitest";
import { vi } from "vite-plus/test";

vi.mock("electron", () => ({}));

import { missingStorageEntries } from "./DesktopRendererStorage.ts";

it("resumes an interrupted copy without overwriting existing renderer data", () => {
  const draft = ["t3code:composer-drafts:v1", '{"prompt":"작업 초안"}'] as const;
  const theme = ["theme", "dark"] as const;
  const empty = ["__proto__", ""] as const;
  assert.deepEqual(missingStorageEntries([draft, theme, empty], [draft, ["new", "value"]]), [
    theme,
    empty,
  ]);
  assert.deepEqual(missingStorageEntries([empty], [empty]), []);
  assert.throws(() => missingStorageEntries([draft, theme], [["theme", "light"]]));
});
