import {
  BearerConnectionTarget,
  PrimaryConnectionTarget,
  type PreparedConnection,
} from "@t3tools/client-runtime/connection";
import {
  EnvironmentId,
  type EnvironmentSpeechModel,
  type EnvironmentSpeechStatus,
} from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { act, render } from "../../../test/render";
import { __setClientSettingsForTests, getClientSettings } from "../../hooks/useSettings";
import { readBrowserClientSettings } from "../../clientPersistenceStorage";
import { chooseRecordingMicrophone } from "../../speech/browserMicrophones";
import {
  useEnvironmentSpeechInput,
  useVoiceTranscriptionDestination,
} from "../../speech/useEnvironmentSpeechInput";
import { chooseAudioDestination, chooseTranscriptCleanup } from "../../speech/voiceConsent";
import { useEnvironmentScope } from "../../state/session";
import { toastManager } from "../ui/toast";
import { SettingsScopeProvider } from "./SettingsScopeContext";
import { SpeechLanguageSelect } from "./SpeechLanguageSelect";
import { VoiceSettingsPanel } from "./VoiceSettingsPanel";

vi.mock(import("../../speech/useEnvironmentSpeechInput"), { spy: true });
vi.mock(import("../../state/session"), { spy: true });

vi.mock("../../connection/runtime", async () => {
  const [rpc, { Atom }] = await Promise.all([
    import("@t3tools/client-runtime/rpc"),
    import("effect/reactivity"),
  ]);
  return {
    connectionAtomRuntime: Atom.runtime(
      rpc.layerRemoteHttpClient((input, init) => globalThis.fetch(input, init)),
    ),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

it.each([{ cpu: null, accelerated: 2.1 }, { cpu: 5, accelerated: null }, { accelerated: 2.1 }])(
  "uses the destination environment's benchmark tier across switches with measurements %j",
  async (secondsPer30s) => {
    const target = new PrimaryConnectionTarget({
      environmentId: EnvironmentId.make("voice-local"),
      label: "Local CPU",
      httpBaseUrl: window.location.origin,
      wsBaseUrl: "ws://localhost",
    });
    const local: PreparedConnection = {
      ...target,
      target,
      socketUrl: target.wsBaseUrl,
      httpAuthorization: null,
    };
    const remote: PreparedConnection = {
      environmentId: EnvironmentId.make("voice-remote"),
      label: "Remote GPU",
      httpBaseUrl: "https://voice.example.test",
      socketUrl: "wss://voice.example.test/ws",
      httpAuthorization: { _tag: "Bearer", token: "test-token" },
      target: new BearerConnectionTarget({
        environmentId: EnvironmentId.make("voice-remote"),
        label: "Remote GPU",
        connectionId: "remote",
      }),
    };
    let prepared = local;
    const remoteStatus = deferred<Response>();
    const remoteRequested = deferred<void>();
    const status = {
      supported: true,
      state: "ready",
      modelId: "both",
      model: "Bilingual",
      size: 100,
      supportsStreaming: true,
      supportsTranslation: false,
      acceleration: "auto",
      modelUnloadTimeout: "never",
      gpuDevices: [],
      benchmarkTier: "cpu",
    } satisfies EnvironmentSpeechStatus;
    const model: EnvironmentSpeechModel = {
      id: "both",
      name: "Bilingual",
      description: "",
      size: 100,
      languages: ["en"],
      accuracy: 1,
      speed: 1,
      recommended: true,
      supportsStreaming: false,
      supportsTranslation: false,
      supportsLanguageDetection: false,
      active: false,
      state: "downloadable",
      benchmark: {
        accuracy: { en: { grade: "A-", errorPercent: 4 } },
        secondsPer30s,
      },
    };
    const cpuBenchmark = `속도: ${secondsPer30s.cpu === undefined ? "서버 업데이트 필요" : secondsPer30s.cpu === null ? "벤치마크 없음" : `${secondsPer30s.cpu}초 / 30초`}`;
    const gpuBenchmark = `속도: ${secondsPer30s.accelerated === null ? "벤치마크 없음" : `${secondsPer30s.accelerated}초 / 30초`}`;
    const fetch = globalThis.fetch;
    using _network = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = new URL(input instanceof Request ? input.url : input, window.location.href);
      if (url.pathname === "/api/voice/status") {
        if (url.origin === remote.httpBaseUrl) {
          remoteRequested.resolve();
          return remoteStatus.promise;
        }
        return Promise.resolve(Response.json(status));
      }
      if (url.pathname === "/api/voice/models")
        return Promise.resolve(Response.json({ models: [model] }));
      return fetch(input, init);
    });
    await vi.mocked(useVoiceTranscriptionDestination).withImplementation(
      () => ({
        environmentId: prepared.environmentId,
        label: prepared.label,
        grantId: "test",
        prepared,
      }),
      async () => {
        const previous = getClientSettings();
        using cleanup = new DisposableStack();
        cleanup.defer(() => __setClientSettingsForTests(previous));
        __setClientSettingsForTests({ ...previous, speechStreaming: true });
        const panel = () => (
          <SettingsScopeProvider search={{}} onChange={() => {}}>
            <VoiceSettingsPanel />
          </SettingsScopeProvider>
        );
        await using screen = await render(panel());
        await expect.element(screen.getByText(cpuBenchmark)).toBeVisible();
        await userEvent.click(screen.getByRole("button", { name: "고급 설정", exact: true }));
        const streaming = screen.getByRole("switch", { name: "실시간 받아쓰기" });
        await expect.element(streaming).toBeEnabled();
        await expect.element(streaming).toBeChecked();
        streaming.element().focus();
        await userEvent.keyboard(" ");
        await vi.waitFor(() => expect(readBrowserClientSettings()?.speechStreaming).toBe(false));
        prepared = remote;
        await screen.rerender(panel());
        await remoteRequested.promise;
        await expect.element(screen.getByText(cpuBenchmark)).not.toBeInTheDocument();
        remoteStatus.resolve(
          Response.json({
            ...status,
            supportsStreaming: false,
            benchmarkTier: "accelerated",
            gpuDevices: [{ id: "gpu", name: "Remote GPU" }],
          }),
        );
        await expect.element(screen.getByText(gpuBenchmark)).toBeVisible();
        await userEvent.click(screen.getByRole("button", { name: "고급 설정", exact: true }));
        await expect.element(streaming).toBeDisabled();
        await expect.element(streaming).not.toBeChecked();
        await expect
          .element(screen.getByText("이 모델은 네이티브 스트리밍을 지원하지 않습니다."))
          .toBeVisible();
        prepared = local;
        await screen.rerender(panel());
        await expect.element(screen.getByText(cpuBenchmark)).toBeVisible();
        await userEvent.click(screen.getByRole("button", { name: "고급 설정", exact: true }));
        await expect.element(screen.getByText(gpuBenchmark)).not.toBeInTheDocument();
        await expect.element(streaming).toBeEnabled();
        await expect.element(streaming).not.toBeChecked();
        streaming.element().focus();
        await userEvent.keyboard(" ");
        await vi.waitFor(() => expect(readBrowserClientSettings()?.speechStreaming).toBe(true));
      },
    );
  },
);

it("tests the selected model after download and preserves its transcript across filters", async () => {
  const target = new PrimaryConnectionTarget({
    environmentId: EnvironmentId.make("voice-filter"),
    label: "Test environment",
    httpBaseUrl: window.location.origin,
    wsBaseUrl: "ws://localhost",
  });
  const prepared = { ...target, target, socketUrl: target.wsBaseUrl, httpAuthorization: null };
  const model: EnvironmentSpeechModel = {
    id: "tiny",
    name: "Tiny",
    description: "",
    size: 100,
    languages: ["en"],
    accuracy: 1,
    speed: 1,
    recommended: false,
    supportsStreaming: false,
    supportsTranslation: false,
    supportsLanguageDetection: false,
    active: true,
    state: "installed",
  };
  const status = {
    supported: true,
    state: "ready",
    modelId: model.id,
    model: model.name,
    size: model.size,
    supportsStreaming: false,
    supportsTranslation: false,
    acceleration: "cpu",
    modelUnloadTimeout: "never",
    gpuDevices: [],
    benchmarkTier: "cpu",
  } satisfies EnvironmentSpeechStatus;
  let installed = false;
  const fetch = globalThis.fetch;
  using _network = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, window.location.href);
    if (url.pathname === "/api/voice/status")
      return Promise.resolve(
        Response.json(installed ? status : { ...status, state: "missing-model" }),
      );
    if (url.pathname === "/api/voice/models/download") {
      installed = true;
      return Promise.resolve(Response.json({ models: [model] }));
    }
    if (url.pathname === "/api/voice/models")
      return Promise.resolve(
        Response.json({
          models: [
            installed ? model : { ...model, state: "downloadable", active: false },
            {
              ...model,
              id: "both",
              name: "Bilingual",
              active: false,
              languages: ["en", "fr"],
              ...(url.searchParams.has("benchmarks")
                ? {
                    benchmark: {
                      accuracy: {
                        en: { grade: "A-", errorPercent: 4 },
                        fr: { grade: "B+", errorPercent: 5.5 },
                      },
                      secondsPer30s: { cpu: 5, accelerated: 2.1 },
                    },
                  }
                : {}),
            },
          ],
        }),
      );
    return fetch(input, init);
  });
  const transcript = "Keep this transcript.";
  using _scope = vi.mocked(useEnvironmentScope).mockReturnValue(true);
  await vi.mocked(useVoiceTranscriptionDestination).withImplementation(
    () => ({ environmentId: target.environmentId, label: target.label, grantId: "test", prepared }),
    async () => {
      await vi.mocked(useEnvironmentSpeechInput).withImplementation(
        (input) => ({
          available: true,
          status,
          transcriptionEnvironmentId: target.environmentId,
          transcriptionEnvironmentLabel: target.label,
          setup: {
            open: false,
            step: 0,
            model: null,
            language: null,
            downloading: false,
            catalogFailed: false,
            retryCatalog: null,
            error: null,
            setOpen: () => {},
            download: async () => {},
            cancelDownload: async () => {},
            startRecording: async () => {},
          },
          state: { phase: "idle", error: null, errorAction: null },
          preview: null,
          level: 0,
          preparing: false,
          blocksSubmission: false,
          freezesEditor: false,
          start: async () => {
            input.commitDraft(transcript, { start: transcript.length, end: transcript.length });
          },
          submitAfterDictation: () => {},
          stop: async () => {},
          cancel: () => {},
          skipPostProcessing: () => {},
        }),
        async () => {
          await using screen = await render(
            <SettingsScopeProvider search={{}} onChange={() => {}}>
              <VoiceSettingsPanel />
            </SettingsScopeProvider>,
          );
          const testModel = screen.getByRole("button", { name: "모델 테스트", exact: true });
          const download = screen.getByRole("button", { name: "다운로드", exact: true });
          await expect.element(download).toBeVisible();
          expect(testModel.query()).toBeNull();
          expect(screen.getByRole("button", { name: "음성 입력 설정" }).query()).toBeNull();
          await userEvent.click(download);
          await expect.element(testModel).toBeVisible();
          expect(screen.getByRole("button", { name: "음성 입력 설정" }).query()).toBeNull();
          await userEvent.click(testModel);
          const result = screen.getByRole("status", { name: "테스트 음성 인식 결과" });
          await expect.element(result).toHaveTextContent(transcript);

          const search = screen.getByRole("searchbox", { name: "음성 인식 모델 검색" });
          await userEvent.fill(search, "no matching model");
          await expect.element(screen.getByText("일치하는 모델이 없습니다.")).toBeVisible();
          await userEvent.clear(search);
          const languages = screen.getByRole("button", { name: /^언어별 필터/ });
          await userEvent.click(languages);
          await userEvent.fill(screen.getByRole("textbox", { name: "언어 검색" }), "fr");
          const french = screen.getByRole("menuitemcheckbox", { name: "프랑스어", exact: true });
          await userEvent.click(french);
          await userEvent.keyboard("{Escape}");
          await expect.element(screen.getByText("Bilingual", { exact: true })).toBeVisible();
          await expect.element(screen.getByText("B+", { exact: true })).toBeVisible();
          expect(screen.container.querySelector("#transcription-test")).toHaveAttribute("hidden");
          await userEvent.click(languages);
          await userEvent.fill(screen.getByRole("textbox", { name: "언어 검색" }), "fr");
          await userEvent.click(french);
          await userEvent.keyboard("{Escape}");
          await expect.element(result).toBeVisible();
          await vi.waitFor(() =>
            expect(
              screen.container.querySelector('[aria-label="테스트 음성 인식 결과"]')?.textContent,
            ).toBe(transcript),
          );
        },
      );
    },
  );
});

it("loads the models of a directly connected destination with its bearer credential", async () => {
  const target = new BearerConnectionTarget({
    environmentId: EnvironmentId.make("voice-remote"),
    label: "MacBook Pro",
    connectionId: "voice-remote",
  });
  const prepared = {
    environmentId: target.environmentId,
    label: target.label,
    httpBaseUrl: window.location.origin,
    socketUrl: "ws://localhost",
    httpAuthorization: {
      _tag: "Bearer" as const,
      token: "remote-access-token",
    },
    target,
  };
  const model: EnvironmentSpeechModel = {
    id: "tiny",
    name: "Tiny",
    description: "",
    size: 100,
    languages: ["en"],
    accuracy: 1,
    speed: 1,
    recommended: false,
    supportsStreaming: false,
    supportsTranslation: false,
    supportsLanguageDetection: false,
    active: false,
    state: "downloadable",
  };
  const status = {
    supported: true,
    state: "missing-model",
    modelId: model.id,
    model: model.name,
    size: model.size,
    supportsStreaming: false,
    supportsTranslation: false,
    acceleration: "cpu",
    modelUnloadTimeout: "never",
    gpuDevices: [],
    benchmarkTier: "cpu",
  } satisfies EnvironmentSpeechStatus;
  const authorizations: Array<string | null> = [];
  const fetch = globalThis.fetch;
  using _network = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, window.location.href);
    if (url.pathname === "/api/voice/status") {
      authorizations.push(new Headers(init?.headers).get("authorization"));
      return Promise.resolve(Response.json(status));
    }
    if (url.pathname === "/api/voice/models")
      return Promise.resolve(Response.json({ models: [model] }));
    return fetch(input, init);
  });
  using notify = vi.spyOn(toastManager, "add").mockReturnValue("test");
  // Restored even when an assertion fails, unlike `withImplementation`.
  using _destination = vi.mocked(useVoiceTranscriptionDestination).mockImplementation(() => ({
    environmentId: target.environmentId,
    label: target.label,
    grantId: "test",
    prepared,
  }));
  await using screen = await render(
    <SettingsScopeProvider search={{}} onChange={() => {}}>
      <VoiceSettingsPanel />
    </SettingsScopeProvider>,
  );
  await vi.waitFor(() => expect(authorizations.length + notify.mock.calls.length).not.toBe(0));
  expect(notify).not.toHaveBeenCalled();
  expect(authorizations).toEqual(["Bearer remote-access-token"]);
  await expect.element(screen.getByText("Tiny", { exact: true })).toBeVisible();
});

it("recovers from a failed download progress poll without notifying, but reports a failed initial load", async () => {
  const target = new PrimaryConnectionTarget({
    environmentId: EnvironmentId.make("voice-progress"),
    label: "Test environment",
    httpBaseUrl: window.location.origin,
    wsBaseUrl: "ws://localhost",
  });
  const prepared = { ...target, target, socketUrl: target.wsBaseUrl, httpAuthorization: null };
  const model: EnvironmentSpeechModel = {
    id: "tiny",
    name: "Tiny",
    description: "",
    size: 100,
    languages: ["en"],
    accuracy: 1,
    speed: 1,
    recommended: false,
    supportsStreaming: false,
    supportsTranslation: false,
    supportsLanguageDetection: false,
    active: false,
    state: "downloading",
  };
  const status = {
    supported: true,
    state: "missing-model",
    modelId: model.id,
    model: model.name,
    size: model.size,
    supportsStreaming: false,
    supportsTranslation: false,
    acceleration: "cpu",
    modelUnloadTimeout: "never",
    gpuDevices: [],
    benchmarkTier: "cpu",
  };
  const unavailable = () => new Response(null, { status: 503 });
  const readModels = vi
    .fn((_withBenchmarks: boolean) => unavailable())
    .mockImplementationOnce(() => Response.json({ models: [model] }))
    .mockImplementationOnce(unavailable)
    .mockImplementationOnce(() => Response.json({ models: [{ ...model, state: "installed" }] }));
  const fetch = globalThis.fetch;
  using _network = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, window.location.href);
    if (url.pathname === "/api/voice/status") return Promise.resolve(Response.json(status));
    if (url.pathname === "/api/voice/models")
      return Promise.resolve(readModels(url.searchParams.has("benchmarks")));
    return fetch(input, init);
  });
  using notify = vi.spyOn(toastManager, "add").mockReturnValue("test");
  await vi.mocked(useVoiceTranscriptionDestination).withImplementation(
    () => ({ environmentId: target.environmentId, label: target.label, grantId: "test", prepared }),
    async () => {
      const panel = (key: string) => (
        <SettingsScopeProvider search={{}} onChange={() => {}}>
          <VoiceSettingsPanel key={key} />
        </SettingsScopeProvider>
      );
      await using screen = await render(panel("first"));
      await expect.element(screen.getByRole("button", { name: "모델 사용" })).toBeVisible();
      expect(readModels.mock.calls.map(([withBenchmarks]) => withBenchmarks)).toEqual([
        true,
        false,
        false,
      ]);
      expect(notify).not.toHaveBeenCalled();
      await screen.rerender(panel("reopened"));
      await vi.waitFor(() =>
        expect(notify).toHaveBeenCalledWith(
          expect.objectContaining({ title: "음성 인식 모델을 불러오지 못했습니다" }),
        ),
      );
    },
  );
});

it.each([
  ["speech-models", "voice-transcription-destination"],
  ["speech-hardware", "voice-transcription-destination"],
  ["speech-streaming", "voice-transcription-destination"],
  ["transcription-test", "voice-transcription-destination"],
  ["speech-correction-word", "speech-post-processing"],
  ["speech-post-processing-model", "speech-post-processing"],
])(
  "searching for disabled %s focuses its opt-in without enabling it",
  async (target, prerequisite) => {
    chooseAudioDestination(null);
    chooseTranscriptCleanup(false);
    await using screen = await render(
      <SettingsScopeProvider search={{}} onChange={() => {}}>
        <VoiceSettingsPanel />
      </SettingsScopeProvider>,
      { router: `/#${target}` },
    );
    await vi.waitFor(() => expect(document.activeElement?.id).toBe(prerequisite));
    await expect
      .element(screen.getByRole("combobox", { name: "음성 인식 대상" }))
      .toHaveTextContent("꺼짐");
    await expect
      .element(screen.getByRole("switch", { name: "음성 인식 결과 정리" }))
      .not.toBeChecked();
  },
);

it("keeps a missing destination selected without claiming it cannot transcribe", async () => {
  __setClientSettingsForTests(getClientSettings());
  using cleanup = new DisposableStack();
  cleanup.defer(() => chooseAudioDestination(null));
  chooseAudioDestination({ kind: "environment", environmentId: EnvironmentId.make("missing") });
  await using screen = await render(
    <SettingsScopeProvider search={{}} onChange={() => {}}>
      <VoiceSettingsPanel />
    </SettingsScopeProvider>,
  );
  await expect
    .element(screen.getByRole("combobox", { name: "음성 인식 대상" }))
    .toHaveTextContent("선택한 환경(사용 불가)");
  await expect.element(screen.getByText(/음성을 인식할 수 없습니다/)).not.toBeInTheDocument();
});

it("shows the model's effective language and restores the saved preference when supported again", async () => {
  const previous = getClientSettings();
  using cleanup = new DisposableStack();
  cleanup.defer(() => __setClientSettingsForTests(previous));
  __setClientSettingsForTests({ ...previous, speechLanguage: "fr" });
  await using screen = await render(<SpeechLanguageSelect model={{ languages: ["en"] }} />);
  const picker = screen.getByRole("combobox", { name: "음성 인식 언어" });
  await expect.element(picker).toHaveTextContent("영어 (프랑스어 사용 불가)");
  await screen.rerender(
    <SpeechLanguageSelect model={{ languages: ["en", "de"], supportsLanguageDetection: true }} />,
  );
  await expect.element(picker).toHaveTextContent("자동 감지 (프랑스어 사용 불가)");
  await screen.rerender(<SpeechLanguageSelect model={{ languages: ["en", "fr"] }} />);
  await expect.element(picker).toHaveTextContent("프랑스어");
  expect(getClientSettings().speechLanguage).toBe("fr");
});

it.each([
  { isComposing: true, keyCode: 13, confirmBeforeEnter: false },
  { isComposing: false, keyCode: 229, confirmBeforeEnter: false },
  { isComposing: true, keyCode: 229, confirmBeforeEnter: true },
])(
  "keeps dictionary drafts during composition and saves punctuation on Enter: %j",
  async ({ confirmBeforeEnter, ...composition }) => {
    const previous = getClientSettings();
    using cleanup = new DisposableStack();
    cleanup.defer(() => __setClientSettingsForTests(previous));
    __setClientSettingsForTests({ ...previous, speechCustomWords: [] });
    await using screen = await render(
      <SettingsScopeProvider search={{}} onChange={() => {}}>
        <VoiceSettingsPanel />
      </SettingsScopeProvider>,
    );
    const confirmComposition = async (input: Element, text: string) => {
      const event = new KeyboardEvent("keydown", {
        key: confirmBeforeEnter ? "Process" : "Enter",
        bubbles: true,
        cancelable: true,
        ...composition,
      });
      await act(() => input.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(false);
      if (confirmBeforeEnter) {
        const confirmedEnter = new KeyboardEvent("keydown", {
          key: "Enter",
          keyCode: 13,
          bubbles: true,
          cancelable: true,
        });
        await act(() => {
          input.dispatchEvent(
            new CompositionEvent("compositionend", { bubbles: true, data: text }),
          );
          input.dispatchEvent(confirmedEnter);
        });
        expect(confirmedEnter.defaultPrevented).toBe(true);
      }
    };
    const releaseCompositionKey = (input: Element) =>
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent("keyup", {
            key: confirmBeforeEnter ? "Process" : "Enter",
            bubbles: true,
            ...composition,
          }),
        );
        if (confirmBeforeEnter) {
          input.dispatchEvent(
            new KeyboardEvent("keyup", { key: "Enter", keyCode: 13, bubbles: true }),
          );
        }
      });
    const termInput = screen.getByRole("textbox", { name: "사전에 단어나 문구 추가" });
    await userEvent.type(termInput, "O'Reilly");
    await confirmComposition(termInput.element(), "O'Reilly");
    expect(getClientSettings().speechCustomWords).toEqual([]);
    await expect.element(termInput).toHaveValue("O'Reilly");
    await releaseCompositionKey(termInput.element());
    await userEvent.keyboard("{Enter}");
    expect(getClientSettings().speechCustomWords[0]?.term).toBe("O'Reilly");
    await userEvent.click(screen.getByRole("button", { name: "O'Reilly의 별칭 추가" }));
    const aliasInput = screen.getByRole("textbox", { name: "O'Reilly의 별칭" });
    await userEvent.type(aliasInput, '"Oh Really"');
    await confirmComposition(aliasInput.element(), '"Oh Really"');
    expect(getClientSettings().speechCustomWords).toEqual([{ term: "O'Reilly", aliases: [] }]);
    await expect.element(aliasInput).toHaveValue('"Oh Really"');
    await releaseCompositionKey(aliasInput.element());
    await userEvent.keyboard("{Enter}");
    expect(getClientSettings().speechCustomWords).toEqual([
      { term: "O'Reilly", aliases: ['"Oh Really"'] },
    ]);
  },
);

it("records from the first connected microphone in the saved order", async () => {
  const previous = getClientSettings();
  using cleanup = new DisposableStack();
  cleanup.defer(() => __setClientSettingsForTests(previous));
  // A single saved microphone from before the order existed comes first.
  __setClientSettingsForTests({ ...previous, voiceMicrophone: "yeti", voiceMicrophones: [] });
  const input = (deviceId: string, label: string) =>
    ({ deviceId, label, groupId: deviceId, kind: "audioinput" }) as MediaDeviceInfo;
  const yeti = input("yeti", "Blue Yeti");
  const airpods = input("airpods", "AirPods Pro");
  using devices = vi
    .spyOn(navigator.mediaDevices, "enumerateDevices")
    .mockResolvedValue([yeti, airpods]);
  const saved = () =>
    getClientSettings().voiceMicrophones.map((entry) =>
      entry.kind === "default" ? "시스템 기본값" : entry.label,
    );
  await using screen = await render(
    <SettingsScopeProvider search={{}} onChange={() => {}}>
      <VoiceSettingsPanel />
    </SettingsScopeProvider>,
  );
  const list = screen.getByRole("list", { name: "마이크 목록(우선순위 순)" });
  await expect.poll(saved).toEqual(["Blue Yeti", "시스템 기본값", "AirPods Pro"]);
  const row = (index: number) => list.getByRole("listitem").nth(index);
  await expect.element(row(0)).toHaveTextContent("1Blue Yeti사용 중");
  expect(await chooseRecordingMicrophone()).toBe("yeti");

  devices.mockResolvedValue([airpods]);
  await userEvent.click(screen.getByRole("button", { name: "마이크 새로고침" }));
  await expect.element(row(0)).toHaveTextContent("1Blue Yeti연결되지 않음");
  await expect.element(row(1)).toHaveTextContent("2시스템 기본값사용 중");
  expect(await chooseRecordingMicrophone()).toBe("");

  await userEvent.click(screen.getByRole("button", { name: "AirPods Pro 위로 이동" }));
  await userEvent.click(screen.getByRole("button", { name: "AirPods Pro 위로 이동" }));
  expect(saved()).toEqual(["AirPods Pro", "Blue Yeti", "시스템 기본값"]);
  await expect
    .element(screen.getByRole("button", { name: "AirPods Pro 위로 이동" }))
    .toBeDisabled();
  expect(await chooseRecordingMicrophone()).toBe("airpods");

  await userEvent.click(screen.getByRole("button", { name: "Blue Yeti 삭제" }));
  expect(saved()).toEqual(["AirPods Pro", "시스템 기본값"]);
  await expect
    .element(screen.getByRole("button", { name: "시스템 기본값 삭제" }))
    .not.toBeInTheDocument();
});
