import {
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  TextGeneratorError,
} from "@t3tools/contracts";
import * as Runtime from "@t3tools/client-runtime/state/runtime";
import * as Cause from "effect/Cause";
import { AsyncResult } from "effect/reactivity";
import { describe, expect, it, vi } from "vite-plus/test";

import { nextTextGeneratorId, testTextGeneratorModel, textGeneratorBrand } from "./textGenerators";

it("shows external errors verbatim and localizes only the generator's own HTTP status", async () => {
  using commands = vi.spyOn(Runtime, "runAtomCommand");
  const check = () =>
    testTextGeneratorModel(EnvironmentId.make("local"), ProviderInstanceId.make("custom"), "model");
  commands.mockResolvedValueOnce(AsyncResult.failure(Cause.fail(new Error("Settings"))));
  expect(await check()).toBe("Settings");
  commands.mockResolvedValueOnce(
    AsyncResult.failure(
      Cause.fail(
        new TextGeneratorError({
          detail: "Custom rejected the API key: Settings rejected the API key.",
          http: { label: "Custom", status: 401, providerMessage: "Settings rejected the API key." },
        }),
      ),
    ),
  );
  expect(await check()).toBe("Custom에서 API 키를 거부했습니다: Settings rejected the API key.");
});

describe("nextTextGeneratorId", () => {
  it("skips ids that would make a selection name another target", () => {
    const settings = {
      providerInstances: {
        [ProviderInstanceId.make("openai")]: { driver: ProviderDriverKind.make("codex") },
      },
      textGenerators: {
        [ProviderInstanceId.make("openai-2")]: {
          kind: "openaiCompatible" as const,
          baseUrl: "https://api.openai.com/v1",
          apiKey: "",
          enabled: true,
        },
      },
    };
    const providers = [{ instanceId: ProviderInstanceId.make("openai-3") }];

    expect(nextTextGeneratorId("openai", settings, providers)).toBe("openai-4");
    // A driver's default instance id is taken even before it has a snapshot or config.
    expect(nextTextGeneratorId("cursor", settings, [])).toBe("cursor-2");
    expect(nextTextGeneratorId("openrouter", settings, providers)).toBe("openrouter");
  });
});

describe("textGeneratorBrand", () => {
  it.each([
    ["anthropic", "https://proxy.example/v1", "anthropic"],
    ["openaiCompatible", "https://openrouter.ai/api/v1", "openrouter"],
    ["openaiCompatible", "https://api.openai.com/v1", "openai"],
    ["openaiCompatible", "http://localhost:11434/v1", "ollama"],
    ["openaiCompatible", "http://localhost:1234/v1", "openaiCompatible"],
  ] as const)("%s at %s shows the %s icon", (kind, baseUrl, brand) => {
    expect(textGeneratorBrand({ kind, baseUrl })).toBe(brand);
  });
});
