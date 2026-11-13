import { RegistryContext } from "@effect/atom-react";
import {
  AuthOrchestrationOperateScope,
  AuthOrchestrationReadScope,
  AuthRelayReadScope,
  AuthRelayWriteScope,
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  type AuthEnvironmentScope,
  type AuthSessionState,
  type EnvironmentCloudLinkStateResult,
  type ServerProvider,
} from "@t3tools/contracts";
import { AsyncResult, Atom } from "effect/reactivity";
import { expect, it, vi } from "vite-plus/test";

import "~/index.css";
import { act, render } from "../../../test/render";

type SessionResult = AsyncResult.AsyncResult<AuthSessionState, Error>;
const state = vi.hoisted(() => ({
  sessions: new Map<string, unknown>(),
  providers: null as unknown,
  config: null as unknown,
  refreshProviders: vi.fn(),
  completeOnboarding: vi.fn(),
  onDone: vi.fn(),
  cloud: false,
  auth: { isLoaded: true, isSignedIn: false, userId: null as string | null },
  linkState: null as unknown,
  linkError: null as string | null,
  refreshLinkState: vi.fn(),
}));

vi.mock(import("@t3tools/client-runtime/state/session"), async (original) => {
  const actual = await original();
  return {
    ...actual,
    createEnvironmentSessionAtoms: ((runtime: never) => ({
      ...actual.createEnvironmentSessionAtoms(runtime),
      sessionStateAtom: (id: EnvironmentId) => state.sessions.get(id),
    })) as never,
  };
});
vi.mock(import("../../cloud/publicConfig"), async (original) => ({
  ...(await original()),
  hasCloudPublicConfig: () => state.cloud,
}));
vi.mock(import("@clerk/react"), async (original) => ({
  ...(await original()),
  useAuth: (() => state.auth) as never,
}));
vi.mock(import("../clerk/useT3ConnectAuthPrompt"), async (original) => ({
  ...(await original()),
  useT3ConnectAuthPrompt: (() => ({ openAuthPrompt: () => {} })) as never,
}));
vi.mock(import("../../cloud/cloudLinkState"), async (original) => {
  const { useAtomValue } = await import("@effect/atom-react");
  return {
    ...(await original()),
    useCloudLinkState: (() => ({
      data: useAtomValue(state.linkState as Atom.Atom<EnvironmentCloudLinkStateResult | null>),
      error: state.linkError,
      isPending: false,
      refresh: state.refreshLinkState,
    })) as never,
  };
});
vi.mock(import("../../onboarding/firstRun"), async (original) => ({
  ...(await original()),
  completeOnboarding: state.completeOnboarding,
}));
vi.mock(import("../../state/environments"), async (original) => ({
  ...(await original()),
  useEnvironments: (() => ({
    environments: [{ environmentId: "primary", label: "primary" }],
  })) as never,
  usePrimaryEnvironmentId: (() => "primary") as never,
}));
vi.mock(import("../../state/server"), async (original) => {
  const actual = await original();
  return {
    ...actual,
    serverEnvironment: {
      ...actual.serverEnvironment,
      providersValueAtom: (() => state.providers) as never,
      configValueAtom: (() => state.config) as never,
      refreshProviders: "refreshProviders" as never,
    },
  };
});
vi.mock(import("../../state/use-atom-command"), async (original) => ({
  ...(await original()),
  useAtomCommand: ((command: "refreshProviders") => state[command]) as never,
}));

import { appAtomRegistry } from "../../rpc/atomRegistry";
import { toastManager } from "../ui/toast";
import { WelcomePage } from "./WelcomePage";

const primaryId = EnvironmentId.make("primary");
const readyClaude: ServerProvider = {
  instanceId: ProviderInstanceId.make("claudeAgent"),
  driver: ProviderDriverKind.make("claudeAgent"),
  enabled: true,
  installed: true,
  version: "1.0.0",
  status: "ready",
  auth: { status: "authenticated" },
  checkedAt: "2026-01-01T00:00:00.000Z",
  models: [],
  slashCommands: [],
  skills: [],
};

function session(scopes: ReadonlyArray<AuthEnvironmentScope>): AuthSessionState {
  return {
    authenticated: true,
    scopes: [AuthOrchestrationReadScope, ...scopes],
    auth: {
      policy: "remote-reachable",
      bootstrapMethods: ["one-time-token"],
      sessionMethods: ["bearer-access-token"],
      sessionCookieName: "t3_session",
    },
  };
}

function sessionAtom(environmentId: EnvironmentId) {
  return state.sessions.get(environmentId) as Atom.Writable<SessionResult>;
}

const NOW = Date.parse("2026-01-01T00:00:00.000Z");

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function pageText() {
  return document.body.textContent ?? "";
}

function button(label: string) {
  const found = [...document.querySelectorAll("button")].find(
    (element) => element.textContent?.trim() === label,
  );
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}

async function click(label: string) {
  const target = button(label);
  expect(target.disabled).toBe(false);
  await act(async () => target.click());
}

async function mountWelcome() {
  return render(
    <RegistryContext.Provider value={appAtomRegistry}>
      <WelcomePage environmentId={primaryId} onDone={state.onDone} />
    </RegistryContext.Provider>,
  );
}

// The mocked modules read `state`, so every test starts by replacing all of it.
// Returns the clock spy so each test can `using` it; the spy would otherwise outlive the test.
function setup() {
  const now = vi.spyOn(Date, "now").mockReturnValue(NOW);
  state.sessions.clear();
  for (const id of [primaryId]) {
    state.sessions.set(
      id,
      Atom.make<SessionResult>(AsyncResult.success(session([AuthOrchestrationOperateScope]))).pipe(
        Atom.keepAlive,
      ),
    );
  }
  state.providers = Atom.make<ReadonlyArray<ServerProvider>>([readyClaude]).pipe(Atom.keepAlive);
  state.config = Atom.make(null).pipe(Atom.keepAlive);
  state.refreshProviders.mockReset().mockResolvedValue(AsyncResult.success(undefined));
  state.completeOnboarding.mockReset().mockResolvedValue(undefined);
  state.onDone.mockReset();
  state.cloud = false;
  state.auth = { isLoaded: true, isSignedIn: false, userId: null };
  state.linkState = Atom.make<EnvironmentCloudLinkStateResult | null>(null).pipe(Atom.keepAlive);
  state.linkError = null;
  state.refreshLinkState.mockReset();
  return now;
}

it("starts without a manual import step while native sessions are shared automatically", async () => {
  using _now = setup();
  await using _screen = await mountWelcome();
  expect(document.querySelector('[role="checkbox"]')).toBeNull();
  expect(pageText()).not.toMatch(/가져오고 시작|대화 가져오기/);
  await click("시작");
  await vi.waitFor(() => expect(state.onDone).toHaveBeenCalledOnce());
  expect(state.completeOnboarding).toHaveBeenCalledOnce();
});

it("keeps setup retryable when saving fails", async () => {
  using _now = setup();
  state.completeOnboarding.mockRejectedValueOnce(new Error("offline"));
  await using _screen = await mountWelcome();
  using toastAdd = vi.spyOn(toastManager, "add");

  await click("시작");
  await vi.waitFor(() => expect(state.completeOnboarding).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(button("시작").disabled).toBe(false));
  expect(state.onDone).not.toHaveBeenCalled();
  expect(toastAdd).toHaveBeenCalledWith(
    expect.objectContaining({ type: "error", title: "설정을 완료하지 못했습니다" }),
  );

  await click("시작");
  await vi.waitFor(() => expect(state.onDone).toHaveBeenCalledOnce());
  expect(state.completeOnboarding).toHaveBeenCalledTimes(2);
});

it("waits for a ready agent to start, and Start without an agent still finishes setup", async () => {
  using _now = setup();
  appAtomRegistry.set(state.providers as Atom.Writable<ReadonlyArray<ServerProvider>>, []);
  await using _screen = await mountWelcome();
  expect(button("시작").disabled).toBe(true);

  await click("에이전트 없이 시작");
  await vi.waitFor(() => expect(state.onDone).toHaveBeenCalledOnce());
  expect(state.completeOnboarding).toHaveBeenCalledOnce();
});

it("blocks leaving and duplicate starts until setup saves", async () => {
  using _now = setup();
  const saved = deferred<void>();
  state.completeOnboarding.mockImplementationOnce(() => saved.promise);
  await using screen = await mountWelcome();

  await click("시작");
  expect(button("시작 중…").disabled).toBe(true);
  await act(async () => button("시작 중…").click());
  // A blocked navigation never settles, so it is not awaited.
  await act(async () => {
    void screen.router?.navigate({ to: "/settings" });
  });
  expect(screen.router?.state.location.pathname).toBe("/");
  expect(state.completeOnboarding).toHaveBeenCalledOnce();
  expect(state.onDone).not.toHaveBeenCalled();

  await act(async () => {
    saved.resolve();
    await saved.promise;
  });
  await vi.waitFor(() => expect(state.onDone).toHaveBeenCalledOnce());
});

it("offers Update for a signed-in agent whose version is broken, and keeps Start off", async () => {
  using _now = setup();
  appAtomRegistry.set(state.providers as Atom.Writable<ReadonlyArray<ServerProvider>>, [
    {
      ...readyClaude,
      compatibilityAdvisory: {
        status: "broken",
        message: "Update Claude Code to 2.0 or later.",
        recommendedVersion: "2.0.0",
        recommendedRange: null,
      },
    },
  ]);
  await using _screen = await mountWelcome();
  await vi.waitFor(() => expect(pageText()).toContain("Update Claude Code to 2.0 or later."));
  const update = [...document.querySelectorAll("a")].find(
    (element) => element.textContent?.trim() === "업데이트",
  );
  expect(update?.getAttribute("href")).toContain("/settings/providers");
  expect(button("시작").disabled).toBe(true);
});

it("opens the list of agents to add once the checks find none, even after a wrong first status", async () => {
  using _now = setup();
  const pi = {
    ...readyClaude,
    instanceId: ProviderInstanceId.make("pi"),
    driver: ProviderDriverKind.make("pi"),
  };
  // Pi's first status says installed before its check runs.
  appAtomRegistry.set(state.providers as Atom.Writable<ReadonlyArray<ServerProvider>>, [
    { ...pi, status: "warning", auth: { status: "unknown" } },
  ]);
  await using _screen = await mountWelcome();
  await act(async () =>
    appAtomRegistry.set(state.providers as Atom.Writable<ReadonlyArray<ServerProvider>>, [
      { ...pi, installed: false, status: "error", auth: { status: "unknown" } },
    ]),
  );
  const fold = () =>
    [...document.querySelectorAll("button")].find((element) =>
      element.textContent?.startsWith("에이전트 설정"),
    );
  await vi.waitFor(() => expect(fold()?.getAttribute("aria-expanded")).toBe("true"));

  // Turning an agent on starts a new check; the open list stays where the user is working.
  await act(async () =>
    appAtomRegistry.set(state.providers as Atom.Writable<ReadonlyArray<ServerProvider>>, [
      { ...pi, installed: false, status: "warning", auth: { status: "unknown" } },
    ]),
  );
  expect(fold()?.getAttribute("aria-expanded")).toBe("true");
});

it("says the phone is set up only once this computer is shared with the signed-in account", async () => {
  using _now = setup();
  state.cloud = true;
  state.auth = { isLoaded: true, isSignedIn: true, userId: "user_1" };
  appAtomRegistry.set(
    sessionAtom(primaryId),
    AsyncResult.success(
      session([AuthOrchestrationOperateScope, AuthRelayReadScope, AuthRelayWriteScope]),
    ),
  );
  state.linkError = "Could not read T3 Connect link state.";
  await using _screen = await mountWelcome();
  await click("설정");
  // A failed read says so instead of asking to share the computer again.
  await vi.waitFor(() => expect(pageText()).toContain("T3 Connect를 확인하지 못했습니다."));
  expect(pageText()).not.toContain("T3 Connect 설정");

  state.linkError = null;
  await act(async () =>
    appAtomRegistry.set(state.linkState as Atom.Writable<EnvironmentCloudLinkStateResult | null>, {
      linked: false,
      cloudUserId: null,
      relayUrl: null,
      relayIssuer: null,
      publishAgentActivity: false,
    }),
  );
  // Signed in, but "Not now" on the share step left this computer unreachable.
  await vi.waitFor(() => expect(pageText()).toContain("T3 Connect 설정"));

  const share = (reachability: EnvironmentCloudLinkStateResult["reachability"]) =>
    act(async () =>
      appAtomRegistry.set(
        state.linkState as Atom.Writable<EnvironmentCloudLinkStateResult | null>,
        {
          linked: true,
          cloudUserId: "user_1",
          relayUrl: null,
          relayIssuer: null,
          managedTunnelActive: true,
          publishAgentActivity: true,
          reachability,
        },
      ),
    );
  const checkedAt = "2026-01-01T00:00:00.000Z";
  await share({
    status: "unreachable",
    checkedAt,
    cause: "connector_not_running",
    reason: "The tunnel is not running.",
    hint: null,
    fix: "Turn T3 Connect off and on.",
  });
  await vi.waitFor(() => expect(pageText()).toContain("T3 Connect 확인"));
  expect(pageText()).not.toContain("휴대폰에서 이 컴퓨터에 연결할 수 있습니다.");

  await share({ status: "reachable", checkedAt, readyConnections: 4, protocol: "quic" });
  await vi.waitFor(() =>
    expect(pageText()).toContain("휴대폰에서 이 컴퓨터에 연결할 수 있습니다."),
  );
  expect(pageText()).not.toContain("T3 Connect 확인");
});
