import { describe, expect, it } from "vite-plus/test";

import {
  findProjectByPath,
  resolveProjectPathForDispatch,
} from "@t3tools/client-runtime/state/projects";

describe("projectPaths", () => {
  it("finds existing projects even when the input formatting differs", () => {
    const existing = findProjectByPath(
      [
        { id: "project-1", cwd: "/repo/app" },
        { id: "project-2", cwd: "C:\\Work\\Repo" },
      ],
      "C:/Work/Repo/",
    );

    expect(existing?.id).toBe("project-2");
  });

  it.each([
    { value: "./foo\\bar", cwd: "/repo", expected: "/repo/foo\\bar" },
    { value: "../..\\notes", cwd: "/repo/current", expected: "/repo/..\\notes" },
    { value: ".\\foo\\bar", cwd: "C:\\repo", expected: "C:\\repo\\foo\\bar" },
    { value: "../foo\\bar", cwd: "C:/repo/current", expected: "C:\\repo\\foo\\bar" },
    {
      value: "..\\foo/bar",
      cwd: "\\\\host\\share\\repo",
      expected: "\\\\host\\share\\foo\\bar",
    },
  ])("resolves $value using the separators of $cwd", ({ value, cwd, expected }) => {
    expect(resolveProjectPathForDispatch(value, cwd)).toBe(expected);
  });
});
