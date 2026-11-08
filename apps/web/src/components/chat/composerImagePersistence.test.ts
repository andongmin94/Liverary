import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { ComposerImageAttachment } from "../../composerDraftStore";
import { readFileAsDataUrl } from "../../lib/imageCompression";
import { serializeComposerImages } from "./composerImagePersistence";

vi.mock("../../lib/imageCompression", () => ({ readFileAsDataUrl: vi.fn() }));

function image(id: string): ComposerImageAttachment {
  const file = new File([id], `${id}.png`, { type: "image/png" });
  return {
    type: "image",
    id,
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    previewUrl: `blob:${id}`,
    file,
  };
}

describe("serializeComposerImages", () => {
  beforeEach(() => {
    vi.mocked(readFileAsDataUrl).mockReset();
  });

  it("keeps composer order while reading only new images and dropping removed images", async () => {
    const a = image("a");
    const b = image("b");
    const c = image("c");
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    const firstRead = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const secondRead = new Promise<string>((resolve) => {
      resolveSecond = resolve;
    });
    vi.mocked(readFileAsDataUrl).mockImplementation((file) =>
      file === a.file ? firstRead : secondRead,
    );

    const pending = serializeComposerImages([a, b], []);
    resolveSecond("data:image/png;base64,Yg==");
    await secondRead;
    resolveFirst("data:image/png;base64,YQ==");
    const first = await pending;
    expect(first).toEqual([
      {
        id: "a",
        name: "a.png",
        mimeType: "image/png",
        sizeBytes: 1,
        dataUrl: "data:image/png;base64,YQ==",
      },
      {
        id: "b",
        name: "b.png",
        mimeType: "image/png",
        sizeBytes: 1,
        dataUrl: "data:image/png;base64,Yg==",
      },
    ]);
    expect(readFileAsDataUrl).toHaveBeenCalledTimes(2);

    vi.mocked(readFileAsDataUrl).mockResolvedValue("data:image/png;base64,Yw==");
    const second = await serializeComposerImages([a, b, c], first);
    expect(second).toEqual([
      ...first,
      {
        id: "c",
        name: "c.png",
        mimeType: "image/png",
        sizeBytes: 1,
        dataUrl: "data:image/png;base64,Yw==",
      },
    ]);
    expect(readFileAsDataUrl).toHaveBeenCalledTimes(3);
    expect(readFileAsDataUrl).toHaveBeenNthCalledWith(3, c.file);

    expect(await serializeComposerImages([a], second)).toEqual([first[0]]);
    expect(await serializeComposerImages([], second)).toEqual([]);
    expect(readFileAsDataUrl).toHaveBeenCalledTimes(3);
  });

  it("preserves cached bytes without trying to read an unavailable file", async () => {
    const a = image("a");
    const persisted = {
      id: a.id,
      name: a.name,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      dataUrl: "data:image/png;base64,YQ==",
    };
    vi.mocked(readFileAsDataUrl).mockRejectedValue(new Error("File is unavailable"));

    expect(await serializeComposerImages([a], [persisted])).toEqual([persisted]);
    expect(readFileAsDataUrl).not.toHaveBeenCalled();
  });

  it("omits failed uncached reads while keeping successfully serialized images", async () => {
    const a = image("a");
    const b = image("b");
    vi.mocked(readFileAsDataUrl)
      .mockRejectedValueOnce(new Error("File is unavailable"))
      .mockResolvedValueOnce("data:image/png;base64,Yg==");

    expect(await serializeComposerImages([a, b], [])).toEqual([
      {
        id: "b",
        name: "b.png",
        mimeType: "image/png",
        sizeBytes: 1,
        dataUrl: "data:image/png;base64,Yg==",
      },
    ]);
    expect(readFileAsDataUrl).toHaveBeenCalledTimes(2);
  });
});
