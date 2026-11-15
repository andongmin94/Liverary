import { describe, expect, it } from "vite-plus/test";
import { isWorkspaceAudioPreviewPath } from "@t3tools/shared/filePreview";

import {
  fileRoutePathSegments,
  isAudioPreviewFile,
  isMarkdownPreviewFile,
  isSvgImagePreviewFile,
  needsWorkspaceFileContents,
  resolveFileLinkPath,
  resolveWorkspaceRelativeFilePath,
} from "./filePath";

describe("resolveFileLinkPath", () => {
  it.each([
    ["/home/maria/project", "~/.agents/AGENTS.md", "/home/maria/.agents/AGENTS.md"],
    ["/Users/maria/project", "~/notes.md", "/Users/maria/notes.md"],
    ["C:\\Users\\maria\\project", "~\\.agents\\AGENTS.md", "C:\\Users\\maria\\.agents\\AGENTS.md"],
  ])("expands a home link from %s", (cwd, path, expected) => {
    expect(resolveFileLinkPath(cwd, path)).toBe(expected);
    expect(fileRoutePathSegments(expected).join("/")).toBe(expected);
  });

  it("does not turn an unresolved home into a workspace path", () => {
    expect(resolveFileLinkPath("/repo", "~/notes.md")).toBeNull();
    expect(resolveFileLinkPath(null, "~/notes.md")).toBeNull();
    expect(resolveFileLinkPath("/repo", "../notes.md")).toBeNull();
  });
});

describe("resolveWorkspaceRelativeFilePath", () => {
  it("converts absolute paths inside the workspace", () => {
    expect(
      resolveWorkspaceRelativeFilePath("/Users/julius/repo", "/Users/julius/repo/src/main.ts"),
    ).toBe("src/main.ts");
    expect(resolveWorkspaceRelativeFilePath("C:\\repo", "c:\\repo\\src\\main.ts")).toBe(
      "src/main.ts",
    );
  });

  it("recognizes home links inside the workspace", () => {
    expect(resolveWorkspaceRelativeFilePath("/home/maria/project", "~/project/src/main.ts")).toBe(
      "src/main.ts",
    );
    expect(
      resolveWorkspaceRelativeFilePath("/home/maria/project", "~/.agents/AGENTS.md"),
    ).toBeNull();
  });

  it("rejects paths outside the workspace", () => {
    expect(resolveWorkspaceRelativeFilePath("/repo", "/other/main.ts")).toBeNull();
    expect(resolveWorkspaceRelativeFilePath("/repo", "../other/main.ts")).toBeNull();
    expect(resolveWorkspaceRelativeFilePath("/repo", "/repo/../outside.txt")).toBeNull();
    expect(resolveWorkspaceRelativeFilePath(null, "/repo/main.ts")).toBeNull();
  });
});

describe("needsWorkspaceFileContents", () => {
  it("reads literal text filenames while metadata is pending, but not audio or directories", () => {
    for (const [relativePath, kind] of [
      ["package.json", "text"],
      ["audio#draft/take.MP3", "audio"],
      ["take?draft.mp3", "audio"],
      ["take.mp3#notes.txt", "text"],
      ["take.mp3?notes.txt", "text"],
      ["icons?draft/logo.SVG", "svg"],
      ["logo#draft.svg", "svg"],
      ["logo.svg#notes.txt", "text"],
      ["logo.svg?notes.txt", "text"],
      ["notes#draft/guide.MDX", "markdown"],
      ["guide?draft.md", "markdown"],
      ["guide.md#notes.txt", "text"],
      ["guide.md?notes.txt", "text"],
    ] as const) {
      expect(isWorkspaceAudioPreviewPath(relativePath), relativePath).toBe(kind === "audio");
      expect(isAudioPreviewFile(relativePath), relativePath).toBe(kind === "audio");
      expect(isSvgImagePreviewFile(relativePath), relativePath).toBe(kind === "svg");
      expect(isMarkdownPreviewFile(relativePath), relativePath).toBe(kind === "markdown");
      const input = { relativePath, activeMode: "source" } as const;
      expect(needsWorkspaceFileContents({ ...input, metadataKind: undefined }), relativePath).toBe(
        kind !== "audio",
      );
      expect(
        needsWorkspaceFileContents({ ...input, metadataKind: "directory" }),
        relativePath,
      ).toBe(false);
      expect(
        needsWorkspaceFileContents({ ...input, activeMode: "preview", metadataKind: "file" }),
        relativePath,
      ).toBe(kind === "markdown");
    }
  });
});
