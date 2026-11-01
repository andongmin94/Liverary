import { RegistryContext } from "@effect/atom-react";
import {
  DEFAULT_UNIFIED_SETTINGS,
  EnvironmentId,
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  ThreadId,
  type ServerProvider,
  type UpstreamUpdateCheckResult,
} from "@t3tools/contracts";
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";
import { describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import "~/index.css";
import { act, render, stubGlobal } from "../../test/render";
import { UpstreamUpdateDialog } from "./UpstreamUpdateDialog";
import { AboutSettingsPanel } from "./settings/SettingsPanels";

const environmentId = EnvironmentId.make("laptop");
const secondaryId = EnvironmentId.make("build-host");
const projectId = ProjectId.make("liverary-source");
const threadId = ThreadId.make("upstream-update");
const codexId = ProviderInstanceId.make("codex");
const claudeId = ProviderInstanceId.make("claudeAgent");
const apiKeyId = ProviderInstanceId.make("api-key");

type LookupResult = AsyncResult.AsyncResult<UpstreamUpdateCheckResult, Error>;
const state = vi.hoisted(() => ({
  providers: null as unknown,
  permission: null as unknown,
  check: vi.fn(),
  launch: vi.fn(),
  close: vi.fn(),
  toast: vi.fn(),
}));

function environment(id: EnvironmentId, label: string) {
  return {
    environmentId: id,
    label,
    connection: { phase: "connected" },
    serverConfig: { environment: { platform: "linux", serverVersion: "1.2.4" } },
  };
}

const environments = [environment(environmentId, "Laptop"), environment(secondaryId, "Build host")];
const providers: ReadonlyArray<ServerProvider> = [
  {
    instanceId: codexId,
    driver: ProviderDriverKind.make("codex"),
    displayName: "Codex 구독",
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated", type: "chatgpt" },
    checkedAt: "2026-11-01T00:00:00.000Z",
    models: [{ slug: "gpt-5.4", name: "GPT-5.4", isCustom: false, capabilities: {} }],
    skills: [],
    slashCommands: [],
  },
  {
    instanceId: claudeId,
    driver: ProviderDriverKind.make("claudeAgent"),
    displayName: "Claude 구독",
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated", type: "max" },
    checkedAt: "2026-11-01T00:00:00.000Z",
    models: [{ slug: "claude-sonnet-4-6", name: "Sonnet", isCustom: false, capabilities: {} }],
    skills: [],
    slashCommands: [],
  },
  {
    instanceId: apiKeyId,
    driver: ProviderDriverKind.make("codex"),
    displayName: "API account",
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated", type: "apiKey" },
    checkedAt: "2026-11-01T00:00:00.000Z",
    models: [{ slug: "gpt-5.4", name: "GPT-5.4", isCustom: false, capabilities: {} }],
    skills: [],
    slashCommands: [],
  },
];

const settings = {
  ...DEFAULT_UNIFIED_SETTINGS,
  providerInstances: Object.fromEntries(
    providers.map((provider) => [provider.instanceId, { driver: provider.driver, enabled: true }]),
  ),
};

vi.mock(import("~/state/server"), async (original) => {
  const actual = await original();
  return {
    ...actual,
    serverEnvironment: {
      ...actual.serverEnvironment,
      checkUpstreamUpdate: state.check,
      providersValueAtom: (() => state.providers) as never,
      launchUpstreamUpdate: {
        ...actual.serverEnvironment.launchUpstreamUpdate,
        permissionAtom: (() => state.permission) as never,
      },
    },
  };
});
vi.mock(import("~/state/use-atom-command"), async (original) => ({
  ...(await original()),
  useAtomCommand: (() => state.launch) as never,
}));
vi.mock(import("~/state/environments"), async (original) => ({
  ...(await original()),
  useEnvironments: (() => ({ environments })) as never,
  usePrimaryEnvironmentId: () => environmentId,
}));
vi.mock(import("~/state/entities"), async (original) => ({
  ...(await original()),
  useProjects: (() =>
    environments.map((entry) => ({
      environmentId: entry.environmentId,
      id: projectId,
      title: "Liverary source",
      workspaceRoot: "/repos/t3-custom",
      archivedAt: null,
    }))) as never,
}));
vi.mock(import("~/hooks/useSettings"), async (original) => ({
  ...(await original()),
  useEnvironmentSettings: (() => settings) as never,
}));
vi.mock(import("~/state/desktopUpdate"), async (original) => ({
  ...(await original()),
  useDesktopUpdateState: () => null,
}));
vi.mock(import("./ui/toast"), async (original) => {
  const actual = await original();
  return { ...actual, toastManager: { ...actual.toastManager, add: state.toast } };
});

function release(status: UpstreamUpdateCheckResult["status"]): UpstreamUpdateCheckResult {
  return {
    status,
    upstream: {
      tag: "v0.1.7",
      sha: "a".repeat(40),
      url: "https://github.com/pingdotgg/t3code/releases/tag/v0.1.7",
    },
    published: {
      tag: "v1.2.4",
      sha: "b".repeat(40),
      url: "https://github.com/andongmin94/t3-custom/releases/tag/v1.2.4",
    },
    integrated: status !== "available",
    releaseRequested: status === "pending",
  };
}

function setup(result: LookupResult) {
  const registry = AtomRegistry.make();
  const lookup = Atom.make(result);
  state.providers = Atom.make(providers);
  state.permission = Atom.make(true);
  state.check.mockReset().mockImplementation(() => lookup);
  state.launch.mockReset().mockResolvedValue(AsyncResult.success({ threadId, resumed: false }));
  state.close.mockReset();
  state.toast.mockReset();
  return { registry, lookup, [Symbol.dispose]: () => registry.dispose() };
}

describe("Liverary upstream update", () => {
  it("opens a fresh lookup from the version check in local web without launching a model", async () => {
    using fixture = setup(AsyncResult.success(release("up-to-date")));
    using _bridge = stubGlobal("desktopBridge", undefined);
    await using screen = await render(
      <RegistryContext.Provider value={fixture.registry}>
        <AboutSettingsPanel />
      </RegistryContext.Provider>,
    );
    expect(window.desktopBridge).toBeUndefined();
    expect(state.check).not.toHaveBeenCalled();
    await screen.getByRole("button", { name: "업데이트 확인", exact: true }).click();
    await expect.element(page.getByRole("dialog")).toBeVisible();
    expect(state.check).toHaveBeenCalledWith({ environmentId, input: {} });
    await expect
      .element(page.getByText("최신 T3 정식 릴리스가 발행된 Liverary에 반영되어 있습니다."))
      .toBeVisible();
    await expect.element(page.getByLabelText("소스 프로젝트")).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "이 모델로 업데이트" }))
      .not.toBeInTheDocument();
    expect(state.launch).not.toHaveBeenCalled();
  });

  it("keeps the chosen subscription and environment through a failed launch and opens an existing update thread", async () => {
    using fixture = setup(AsyncResult.initial(true));
    await using screen = await render(
      <RegistryContext.Provider value={fixture.registry}>
        <UpstreamUpdateDialog onClose={state.close} />
      </RegistryContext.Provider>,
    );
    await expect.element(page.getByText("T3 정식 릴리스를 확인하는 중…")).toBeVisible();
    await expect.element(page.getByLabelText("소스 프로젝트")).not.toBeInTheDocument();
    expect(state.launch).not.toHaveBeenCalled();

    await act(() =>
      fixture.registry.set(fixture.lookup, AsyncResult.success(release("available"))),
    );
    await page.getByLabelText("실행 환경").click();
    await page.getByRole("option", { name: "Build host" }).click();
    await page.getByLabelText("소스 프로젝트").click();
    await page.getByRole("option", { name: /Liverary source/ }).click();
    await page.getByRole("button", { name: "구독 모델", exact: true }).click();
    await expect
      .element(page.getByRole("button", { name: "API account", exact: true }))
      .not.toBeInTheDocument();
    await page.getByRole("button", { name: "Claude 구독", exact: true }).click();
    await page.getByRole("option", { name: /Sonnet/ }).click();
    expect(state.launch).not.toHaveBeenCalled();

    state.launch.mockResolvedValueOnce(AsyncResult.fail(new Error("소스 체크아웃을 확인하세요.")));
    await page.getByRole("button", { name: "이 모델로 업데이트", exact: true }).click();
    await expect
      .element(page.getByRole("alert"))
      .toMatchTextContent(/소스 체크아웃을 확인하세요\./);
    await expect
      .element(page.getByRole("button", { name: "구독 모델", exact: true }))
      .toMatchTextContent(/Sonnet/);
    const request = {
      environmentId: secondaryId,
      input: {
        projectId,
        modelSelection: { instanceId: claudeId, model: "claude-sonnet-4-6" },
        upstreamSha: "a".repeat(40),
      },
    };
    expect(state.launch).toHaveBeenLastCalledWith(request);

    state.launch.mockResolvedValueOnce(AsyncResult.success({ threadId, resumed: true }));
    await page.getByRole("button", { name: "이 모델로 업데이트", exact: true }).click();
    await vi.waitFor(() =>
      expect(screen.router?.state.location.pathname).toBe(`/${secondaryId}/${threadId}`),
    );
    expect(state.launch).toHaveBeenLastCalledWith(request);
    expect(state.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "기존 업데이트 대화를 열었습니다." }),
    );
    expect(state.close).toHaveBeenCalledOnce();
  });

  it("blocks launch on a lookup error and offers pending publication only after a successful lookup", async () => {
    using fixture = setup(AsyncResult.fail(new Error("GitHub 연결 실패")));
    await using _screen = await render(
      <RegistryContext.Provider value={fixture.registry}>
        <UpstreamUpdateDialog onClose={state.close} />
      </RegistryContext.Provider>,
    );
    await expect.element(page.getByRole("alert")).toMatchTextContent(/GitHub 연결 실패/);
    await expect.element(page.getByRole("button", { name: "다시 확인" })).toBeEnabled();
    await expect
      .element(page.getByRole("button", { name: "이 모델로 업데이트" }))
      .not.toBeInTheDocument();
    await act(() => fixture.registry.set(fixture.lookup, AsyncResult.success(release("pending"))));
    await expect
      .element(
        page.getByText("아직 발행되지 않은 업데이트가 있습니다. 에이전트가 이어서 확인합니다."),
      )
      .toBeVisible();
    await expect.element(page.getByLabelText("소스 프로젝트")).toBeVisible();
    await expect.element(page.getByRole("button", { name: "이 모델로 업데이트" })).toBeDisabled();
    expect(state.launch).not.toHaveBeenCalled();
  });
});
