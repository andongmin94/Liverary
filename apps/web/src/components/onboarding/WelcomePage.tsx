import { onboardingKo } from "~/locales/ko/onboarding";
import { useAuth } from "@clerk/react";
import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId, ServerConfig, ServerProvider } from "@t3tools/contracts";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { resolveProviderInstanceDisplayName as agentName } from "@t3tools/client-runtime/state/provider-instance-display";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import {
  AuthProvidersManageScope,
  AuthRelayReadScope,
  AuthRelayWriteScope,
  AuthTerminalOperateScope,
  isManagedDriverAllowed,
  ProviderDriverKind,
  ThreadId,
} from "@t3tools/contracts";
import { Link, useBlocker } from "@tanstack/react-router";
import * as Schema from "effect/Schema";
import { CheckIcon, ChevronDownIcon, PlusIcon, SmartphoneIcon, TerminalIcon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";

import { TYPOGRAPHY_ADVANCED_STORAGE_KEY } from "../../appearanceFonts";
import { isElectron } from "../../env";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { usePersistEnvironmentProviderInstanceMutation } from "../../hooks/useSettings";
import { useCloudLinkState } from "../../cloud/cloudLinkState";
import { hasCloudPublicConfig } from "../../cloud/publicConfig";
import { PRIVACY_POLICY_URL } from "../../legalLinks";
import { workspaceAreaProps } from "../../lib/workspaceFocus";
import { useT3ConnectAuthPrompt } from "../clerk/useT3ConnectAuthPrompt";
import { completeOnboarding } from "../../onboarding/firstRun";
import {
  isInstallableDriver,
  resolveOnboardingProviderInstallCommand,
  resolveOnboardingProviderLoginCommand,
  type InstallableDriver,
} from "../../onboarding/providerReadiness.logic";
import {
  groupWelcomeAgents,
  isBrokenVersion,
  turnedOnInstance,
  welcomeAgentState,
  welcomeOffersPhone,
} from "../../onboarding/welcomePage.logic";
import { randomUUID } from "../../lib/utils";
import { useEnvironments, usePrimaryEnvironmentId } from "../../state/environments";
import { useManagedPolicy } from "../../state/managedPolicy";
import { serverEnvironment } from "../../state/server";
import { readEnvironmentScope, useEnvironmentScope } from "../../state/session";
import { terminalEnvironment } from "../../state/terminal";
import { useAtomCommand } from "../../state/use-atom-command";
import { getProviderSummary } from "../settings/providerStatus";
import { AddProviderInstanceDialog } from "../settings/AddProviderInstanceDialog";
import { useDesktopCliCommand } from "../settings/CliCommandSettingsRow";
import { TerminalViewport } from "../ThreadTerminalDrawer";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { ACPRegistryIcon } from "../Icons";
import { Button } from "../ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import { QRCodeSvg } from "../ui/qr-code";
import { SidebarInset } from "../ui/sidebar";
import { toastManager } from "../ui/toast";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { cn } from "../../lib/utils";

const AGENT_ONBOARDING_THREAD_ID = ThreadId.make("onboarding-agent-setup");

/**
 * First-run page for one computer: its agents, shared conversations, and the phone app.
 */
export function WelcomePage({
  environmentId,
  onDone,
}: {
  readonly environmentId: EnvironmentId;
  readonly onDone: () => void | Promise<void>;
}) {
  const { environments } = useEnvironments();
  const label =
    environments.find((environment) => environment.environmentId === environmentId)?.label ??
    onboardingKo["this computer"];
  const agentReady = useWelcomeAgents(environmentId).readyCount > 0;
  // The phone and `liverary` on PATH belong to the primary computer, so only it offers them.
  const isPrimary = usePrimaryEnvironmentId() === environmentId;
  // The same access Settings → Sharing & access checks.
  const canReadRelay = useEnvironmentScope(environmentId, AuthRelayReadScope);
  const canWriteRelay = useEnvironmentScope(environmentId, AuthRelayWriteScope);
  const showPhone = welcomeOffersPhone({
    isPrimary,
    cloud: hasCloudPublicConfig(),
    canShare: canReadRelay && canWriteRelay,
    policy: useManagedPolicy(environmentId),
  });
  const [isStarting, setIsStarting] = useState(false);
  const holdPageRef = useRef(false);
  useBlocker({
    shouldBlockFn: () => {
      if (!holdPageRef.current) return false;
      toastManager.add({
        id: "welcome-finishing",
        type: "info",
        title: onboardingKo["Finishing setup"],
        description: onboardingKo["One moment."],
      });
      return true;
    },
    // Electron cancels a quit silently when unload is blocked.
    enableBeforeUnload: false,
  });
  const finishingPromiseRef = useRef<Promise<boolean> | null>(null);
  const completionErrorToastIdRef = useRef<ReturnType<typeof toastManager.add> | null>(null);
  const finish = () => {
    if (finishingPromiseRef.current !== null) return finishingPromiseRef.current;
    if (completionErrorToastIdRef.current !== null) {
      toastManager.close(completionErrorToastIdRef.current);
      completionErrorToastIdRef.current = null;
    }

    setIsStarting(true);
    holdPageRef.current = true;
    const completion = completeOnboarding()
      .then(async () => {
        if (completionErrorToastIdRef.current !== null) {
          toastManager.close(completionErrorToastIdRef.current);
          completionErrorToastIdRef.current = null;
        }
        // Release before onDone so its own navigation is not blocked.
        holdPageRef.current = false;
        await onDone();
        return true;
      })
      .catch(() => {
        holdPageRef.current = false;
        const errorToast = {
          type: "error",
          title: onboardingKo.setupFailed,
          description: onboardingKo.saveFailed,
        } as const;
        if (completionErrorToastIdRef.current === null) {
          completionErrorToastIdRef.current = toastManager.add(errorToast);
        } else {
          toastManager.update(completionErrorToastIdRef.current, errorToast);
        }
        return false;
      })
      .finally(() => {
        if (finishingPromiseRef.current === completion) {
          finishingPromiseRef.current = null;
          setIsStarting(false);
        }
      });
    finishingPromiseRef.current = completion;
    return completion;
  };
  const start = () => {
    void finish();
  };

  return (
    <SidebarInset
      {...workspaceAreaProps("home", 1, onboardingKo["Welcome"])}
      role="main"
      className="h-dvh min-h-0 overflow-hidden overscroll-y-none"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        {/* The desktop window only moves where CSS opts in, so keep a titlebar strip. */}
        {isElectron ? <WorkspacePageHeader electron /> : null}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-gutter-both">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 pt-12 pb-8 sm:pt-20">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {onboardingKo["Welcome to Liverary"]}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{onboardingKo.settingUp(label)}</p>
            <div className="mt-10 border-t border-border/60">
              <AgentsSection environmentId={environmentId} label={label} isPrimary={isPrimary} />
              <WelcomeSection title={onboardingKo.sharedConversations}>
                <p className="py-2 text-sm text-foreground">{onboardingKo.automaticSessions}</p>
                <p className="pb-2 text-xs leading-relaxed text-muted-foreground">
                  {onboardingKo.sharedSessionsSupport}
                </p>
              </WelcomeSection>
              {showPhone ? <PhoneSection environmentId={environmentId} /> : null}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {agentReady ? (
                <span />
              ) : (
                <Button variant="ghost-muted" disabled={isStarting} onClick={start}>
                  {onboardingKo["Start without an agent"]}
                </Button>
              )}
              <div className="flex items-center gap-3">
                {agentReady ? null : (
                  <span className="text-xs text-muted-foreground">
                    {onboardingKo["Set up one agent to start."]}
                  </span>
                )}
                <Button disabled={!agentReady || isStarting} onClick={start}>
                  {isStarting ? onboardingKo["Starting…"] : onboardingKo["Start"]}
                </Button>
              </div>
            </div>
            <TelemetryNotice />
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}

function TelemetryNotice() {
  return (
    <p className="mt-auto pt-12 text-2xs leading-relaxed text-muted-foreground/70">
      {onboardingKo.privacyBeforeLink}{" "}
      <a
        className="underline decoration-current/40 underline-offset-2 hover:text-muted-foreground"
        href={PRIVACY_POLICY_URL}
        target="_blank"
        rel="noreferrer noopener"
      >
        {onboardingKo.privacyPolicy}
      </a>
    </p>
  );
}

// Each part of the page is one band: its label on the left, its rows on the right.
function WelcomeSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="grid gap-x-10 border-b border-border/60 py-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
      <h2 className="text-sm leading-10 text-muted-foreground">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

// Rows share one icon column, so names and steps line up down the page.
function RowIcon({ children }: { readonly children: ReactNode }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
      {children}
    </span>
  );
}

interface AgentTerminalSession {
  readonly environmentId: EnvironmentId;
  readonly driver: InstallableDriver;
  readonly providerInstanceId: ServerProvider["instanceId"];
  readonly cwd: string;
  readonly command: string;
  readonly keybindings: ServerConfig["keybindings"];
}

// Shared by the page (to enable Start) and the agents section, so both agree on what is ready.
function useWelcomeAgents(environmentId: EnvironmentId) {
  const providers = useAtomValue(serverEnvironment.providersValueAtom(environmentId));
  const serverConfig = useAtomValue(serverEnvironment.configValueAtom(environmentId));
  const managedPolicy = serverConfig?.managedPolicy;
  return {
    serverConfig,
    ...groupWelcomeAgents(providers, serverConfig?.settings, agentName, (provider) =>
      isManagedDriverAllowed(managedPolicy, provider.driver),
    ),
  };
}

const ACP_REGISTRY_DRIVER_KIND = ProviderDriverKind.make("acpRegistry");

function AgentsSection({
  environmentId,
  label,
  isPrimary,
}: {
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly isPrimary: boolean;
}) {
  const { serverConfig, checking, found, available } = useWelcomeAgents(environmentId);
  const refreshProviders = useAtomCommand(serverEnvironment.refreshProviders, {
    reportFailure: false,
  });
  const persistProviderInstance = usePersistEnvironmentProviderInstanceMutation(environmentId);
  const canOperateTerminal = useEnvironmentScope(environmentId, AuthTerminalOperateScope);
  const canManageProviders = useEnvironmentScope(environmentId, AuthProvidersManageScope);
  const [terminalSession, setTerminalSession] = useState<AgentTerminalSession | null>(null);
  const [moreOpen, setMoreOpen] = useState<boolean | null>(null);
  const [addingProvider, setAddingProvider] = useState(false);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- asks the environment to refresh its provider list when the environment changes
  useEffect(() => {
    void refreshProviders({ environmentId, input: {} });
  }, [environmentId, refreshProviders]);

  // Opened once the finished checks find nothing, since adding an agent is then the task. A first
  // status can be wrong, so this waits for the checks, and a later check never closes it.
  if (moreOpen === null && !checking && found.length === 0) setMoreOpen(true);
  const showMore = moreOpen ?? false;
  const acpAllowed = isManagedDriverAllowed(serverConfig?.managedPolicy, ACP_REGISTRY_DRIVER_KIND);
  const stateOf = (provider: ServerProvider) => welcomeAgentState(provider, serverConfig?.settings);
  const needsInstallOrSignIn = (provider: ServerProvider) => {
    const state = stateOf(provider);
    return (
      isInstallableDriver(provider.driver) &&
      !isBrokenVersion(provider) &&
      (state === "install" || state === "signIn")
    );
  };
  const openTerminal = (provider: ServerProvider) => {
    if (
      !isInstallableDriver(provider.driver) ||
      serverConfig === null ||
      !readEnvironmentScope(environmentId, AuthTerminalOperateScope)
    )
      return;
    setTerminalSession({
      environmentId,
      driver: provider.driver,
      providerInstanceId: provider.instanceId,
      cwd: serverConfig.cwd,
      command: provider.installed
        ? resolveOnboardingProviderLoginCommand(
            provider,
            serverConfig.settings,
            serverConfig.environment.platform.os,
          )
        : resolveOnboardingProviderInstallCommand(
            provider.driver,
            serverConfig.environment.platform.os,
          ),
      keybindings: serverConfig.keybindings,
    });
  };

  const turnOn = async (provider: ServerProvider) => {
    if (serverConfig === null) return;
    const instance = serverConfig.settings.providerInstances[provider.instanceId] ?? {
      driver: provider.driver,
    };
    const result = await persistProviderInstance({
      operation: "upsert",
      instanceId: provider.instanceId,
      instance: turnedOnInstance(instance),
    });
    if (result._tag === "Failure") {
      if (!isAtomCommandInterrupted(result)) {
        const cause = squashAtomCommandFailure(result);
        toastManager.add({
          type: "error",
          title: onboardingKo.turnOnFailed(agentName(provider)),
          ...(cause instanceof Error ? { description: cause.message } : {}),
        });
      }
      return;
    }
    void refreshProviders({ environmentId, input: { instanceId: provider.instanceId } });
  };

  // One action per agent, the same in the list and in the grid.
  const actionFor = (provider: ServerProvider) => {
    const state = stateOf(provider);
    const name = agentName(provider);
    const settingsAction = (actionLabel: string) => (
      <Button
        size="xs"
        variant="outline"
        aria-label={`${actionLabel}: ${name}`}
        render={
          <Link
            to="/settings/providers"
            search={{ environmentId, instanceId: provider.instanceId }}
          />
        }
      >
        {actionLabel}
      </Button>
    );
    if (state === "disabled") {
      return (
        <Button
          size="xs"
          variant="outline"
          aria-label={onboardingKo.turnOnAgent(name)}
          disabled={!canManageProviders || serverConfig === null}
          onClick={() => void turnOn(provider)}
        >
          {onboardingKo["Turn on"]}
        </Button>
      );
    }
    // Settings updates a broken CLI the way it was installed, including a custom binary path.
    if (isBrokenVersion(provider)) return settingsAction(onboardingKo["Update"]);
    if (needsInstallOrSignIn(provider)) {
      return (
        <TerminalAction
          name={name}
          signIn={state === "signIn"}
          disabled={
            terminalSession?.providerInstanceId === provider.instanceId ||
            serverConfig === null ||
            !canOperateTerminal
          }
          onClick={() => openTerminal(provider)}
        />
      );
    }
    return settingsAction(
      state === "signIn"
        ? onboardingKo.signIn
        : state === "attention"
          ? onboardingKo["Details"]
          : onboardingKo["Set up"],
    );
  };

  const notes = [
    !canOperateTerminal && [...found, ...available].some(needsInstallOrSignIn)
      ? onboardingKo.cannotControlTerminals
      : null,
    !canManageProviders &&
    (acpAllowed || [...found, ...available].some((provider) => stateOf(provider) === "disabled"))
      ? onboardingKo["This connection cannot manage agents."]
      : null,
  ].filter((note) => note !== null);

  return (
    <WelcomeSection title={onboardingKo.agents}>
      {found.map((provider) => (
        <AgentRow
          key={provider.instanceId}
          provider={provider}
          state={stateOf(provider)}
          action={actionFor(provider)}
        />
      ))}
      {checking && found.length === 0 ? (
        <p className="text-sm leading-10 text-muted-foreground">
          {onboardingKo.checkingComputer(label)}
        </p>
      ) : null}
      {notes.map((note) => (
        <p key={note} className="pl-8 text-xs text-muted-foreground">
          {note}
        </p>
      ))}
      <Collapsible open={showMore} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger className="group flex min-h-10 w-full items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          <RowIcon>
            <PlusIcon className="size-4" />
          </RowIcon>
          <span
            className={cn(
              "text-sm group-hover:text-foreground",
              found.length > 0 ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {found.length > 0 ? onboardingKo["Add more agents"] : onboardingKo["Set up an agent"]}
          </span>
          {showMore ? null : <AgentLogoStack providers={available} acp={acpAllowed} />}
          <ChevronDownIcon className="ml-auto size-4 text-muted-foreground group-data-panel-open:rotate-180" />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {available.map((provider) => (
              <AgentRow
                key={provider.instanceId}
                provider={provider}
                state={stateOf(provider)}
                compact
                action={actionFor(provider)}
              />
            ))}
          </div>
          {acpAllowed ? (
            <div className="flex min-h-9 items-center gap-3">
              <RowIcon>
                <ACPRegistryIcon className="size-4" />
              </RowIcon>
              <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                {onboardingKo["More agents in the ACP Registry"]}
              </span>
              <Button
                size="xs"
                variant="outline"
                disabled={!canManageProviders}
                onClick={() => setAddingProvider(true)}
              >
                {onboardingKo["Browse"]}
              </Button>
            </div>
          ) : null}
        </CollapsiblePanel>
      </Collapsible>
      {isPrimary ? <CliPathSetup /> : null}
      {terminalSession !== null ? (
        <AgentInstallTerminal
          key={`${terminalSession.environmentId}:${terminalSession.providerInstanceId}:${terminalSession.driver}`}
          session={terminalSession}
          onClose={() => {
            setTerminalSession(null);
            void refreshProviders({ environmentId, input: {} });
          }}
        />
      ) : null}
      {addingProvider ? (
        <AddProviderInstanceDialog
          open
          environmentId={environmentId}
          environmentLabel={label}
          showMoreProviders
          onOpenChange={setAddingProvider}
          onCreated={() => {
            void refreshProviders({ environmentId, input: {} });
          }}
        />
      ) : null}
    </WelcomeSection>
  );
}

// A quiet preview of what the fold holds; the names are inside it.
function AgentLogoStack({
  providers,
  acp,
}: {
  readonly providers: ReadonlyArray<ServerProvider>;
  readonly acp: boolean;
}) {
  if (providers.length === 0 && !acp) return null;
  return (
    <span className="flex items-center gap-2 opacity-60 grayscale" aria-hidden>
      {providers.slice(0, 6).map((provider) => (
        <ProviderInstanceIcon
          key={provider.instanceId}
          driverKind={provider.driver}
          displayName={agentName(provider)}
          iconClassName="size-3.5"
        />
      ))}
      {acp ? <ACPRegistryIcon className="size-3.5" /> : null}
    </span>
  );
}

function PhoneSection({ environmentId }: { readonly environmentId: EnvironmentId }) {
  const [open, setOpen] = useState(false);
  return (
    <WelcomeSection title={onboardingKo["Phone"]}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex min-h-10 items-center gap-3 py-1">
          <RowIcon>
            <SmartphoneIcon className="size-4" />
          </RowIcon>
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
            {onboardingKo["Use Liverary on your phone"]}
          </span>
          <CollapsibleTrigger render={<Button variant="ghost-muted" size="xs" />}>
            {open ? onboardingKo["Hide"] : onboardingKo["Set up"]}
            <ChevronDownIcon className={cn("size-3.5", open && "rotate-180")} />
          </CollapsibleTrigger>
        </div>
        <CollapsiblePanel>
          <div className="flex items-center gap-8 pt-2 pb-3 pl-8">
            <ol className="min-w-0 flex-1 space-y-5">
              <PhoneStep step={1}>
                <p className="text-sm text-foreground">
                  {onboardingKo["Scan to read how to build the mobile client."]}
                </p>
              </PhoneStep>
              <PhoneStep step={2}>
                <PhoneConnectLink environmentId={environmentId} />
              </PhoneStep>
            </ol>
            {/* One code for both stores: the link opens the store that matches the phone. */}
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <QRCodeSvg
                value="https://github.com/andongmin94/Liverary/blob/main/apps/mobile/README.md"
                size={124}
                level="M"
                marginSize={2}
                title={onboardingKo.mobileBuildGuide}
              />
            </div>
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </WelcomeSection>
  );
}

function PhoneStep({ step, children }: { readonly step: number; readonly children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-3 shrink-0 text-sm text-muted-foreground tabular-nums">{step}</span>
      <div className="flex min-w-0 flex-col items-start gap-2">{children}</div>
    </li>
  );
}

function PhoneConnectLink({ environmentId }: { readonly environmentId: EnvironmentId }) {
  const { isLoaded, isSignedIn, userId } = useAuth({ treatPendingAsSignedOut: false });
  const { openAuthPrompt } = useT3ConnectAuthPrompt();
  const linkState = useCloudLinkState(environmentId);
  const refreshLinkState = useEffectEvent(linkState.refresh);
  // The server rechecks the tunnel every 30 s; read its latest result while this panel is open.
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- 30 s interval that refreshes the cloud link reachability while mounted
  useEffect(() => {
    const interval = window.setInterval(() => refreshLinkState(), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const link = linkState.data;
  // The phone reaches this computer through its tunnel; older servers leave that flag out.
  const shared =
    link !== null &&
    link.linked &&
    link.linkRevoked !== true &&
    link.cloudUserId === userId &&
    link.managedTunnelActive !== false;
  // The server checks the tunnel on its own; until it has, the result is unknown.
  const reachability = shared ? link.reachability?.status : undefined;
  const settingsLink = (label: string) => (
    <Button variant="outline" size="xs" render={<Link to="/settings/access" />}>
      {label}
    </Button>
  );
  if (isSignedIn && link === null && linkState.isPending) {
    return <p className="text-sm text-muted-foreground">{onboardingKo["Checking T3 Connect…"]}</p>;
  }
  if (isSignedIn && linkState.error !== null) {
    return (
      <>
        <p className="text-sm text-foreground">{onboardingKo["Could not check T3 Connect."]}</p>
        {settingsLink(onboardingKo["Check T3 Connect"])}
      </>
    );
  }
  if (isSignedIn && reachability === "reachable") {
    return (
      <p className="flex gap-1.5 text-sm text-foreground">
        <CheckIcon className="mt-0.5 size-4 shrink-0 text-success-foreground" />
        {
          onboardingKo[
            "Your phone can reach this computer. Sign in to the app with the same account."
          ]
        }
      </p>
    );
  }
  if (isSignedIn && shared && reachability === undefined) {
    return (
      <p className="text-sm text-foreground">
        {
          onboardingKo[
            "T3 Connect is on for this computer. Sign in to the app with the same account."
          ]
        }
      </p>
    );
  }
  if (isSignedIn) {
    // Signing in alone does not share this computer, for example after "Not now".
    return (
      <>
        <p className="text-sm text-foreground">
          {shared
            ? onboardingKo["T3 Connect is on, but the app cannot reach this computer."]
            : onboardingKo["Signed in. Share this computer so the app can reach it."]}
        </p>
        {settingsLink(
          shared ? onboardingKo["Check T3 Connect"] : onboardingKo["Set up T3 Connect"],
        )}
      </>
    );
  }
  return (
    <>
      <p className="text-sm text-foreground">
        {onboardingKo["Sign in to T3 Connect here, then in the app with the same account."]}
      </p>
      <Button variant="outline" size="xs" disabled={!isLoaded} onClick={openAuthPrompt}>
        {onboardingKo["Sign in to T3 Connect"]}
      </Button>
    </>
  );
}

function TerminalAction({
  name,
  signIn,
  disabled,
  onClick,
}: {
  readonly name: string;
  readonly signIn: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
}) {
  const label = signIn ? onboardingKo.signIn : onboardingKo.install;
  return (
    <Button
      size="xs"
      variant="outline"
      aria-label={`${label}: ${name}`}
      disabled={disabled}
      onClick={onClick}
    >
      <TerminalIcon className="size-3.5" />
      {label}
    </Button>
  );
}

function AgentRow({
  provider,
  state,
  action,
  compact = false,
}: {
  readonly provider: ServerProvider;
  readonly state: ReturnType<typeof welcomeAgentState>;
  readonly action?: ReactNode;
  // A row in the "Add more agents" grid: the button carries the state, so no detail line.
  readonly compact?: boolean;
}) {
  const name = agentName(provider);
  // Claude Code and Codex tiles show Install or Set up; other agents that are on say why not.
  const brokenMessage = isBrokenVersion(provider)
    ? (provider.compatibilityAdvisory?.message ?? null)
    : null;
  const detail =
    state === "install"
      ? isInstallableDriver(provider.driver)
        ? null
        : onboardingKo["Not installed"]
      : compact || state === "ready" || state === "checking"
        ? null
        : state === "attention"
          ? (provider.unavailableReason ??
            brokenMessage ??
            provider.message ??
            getProviderSummary(provider).headline)
          : (brokenMessage ?? getProviderSummary(provider).headline);
  return (
    <div className={cn("flex items-center gap-3", compact ? "min-h-9" : "min-h-10 py-1")}>
      <RowIcon>
        <ProviderInstanceIcon
          driverKind={provider.driver}
          displayName={name}
          iconClassName={compact ? "size-4" : "size-[18px]"}
        />
      </RowIcon>
      <div className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm text-foreground", !compact && "font-medium")}>
          {name}
        </span>
        {detail ? (
          <p className="line-clamp-2 text-xs leading-relaxed break-words text-muted-foreground">
            {detail}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        {state === "ready" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success-foreground">
            <CheckIcon className="size-3.5" />
            {onboardingKo.ready}
          </span>
        ) : state === "checking" ? (
          <span className="text-xs text-muted-foreground">{onboardingKo.checking}</span>
        ) : (
          action
        )}
      </div>
    </div>
  );
}

function AgentInstallTerminal({
  session,
  onClose,
}: {
  readonly session: AgentTerminalSession;
  readonly onClose: () => void;
}) {
  const { command, cwd, driver, environmentId, keybindings, providerInstanceId } = session;
  const canOperateTerminal = useEnvironmentScope(environmentId, AuthTerminalOperateScope);
  const [advancedTypography] = useLocalStorage(
    TYPOGRAPHY_ADVANCED_STORAGE_KEY,
    false,
    Schema.Boolean,
  );
  const openTerminal = useAtomCommand(terminalEnvironment.open, { reportFailure: false });
  const writeTerminal = useAtomCommand(terminalEnvironment.write, { reportFailure: false });
  const closeTerminal = useAtomCommand(terminalEnvironment.close, { reportFailure: false });
  const setupQueueRef = useRef(Promise.resolve());
  const setupGenerationRef = useRef(0);
  const activeSetupGenerationRef = useRef<number | null>(null);
  const [terminalId] = useState(() => `onboarding-${driver}-${randomUUID()}`);
  const threadRef = scopeThreadRef(environmentId, AGENT_ONBOARDING_THREAD_ID);
  const [setupAttempt, setSetupAttempt] = useState(0);
  const [setupState, setSetupState] = useState<
    "preparing" | "ready" | "openFailed" | "writeFailed"
  >("preparing");
  const terminalReady = setupState === "ready" || setupState === "writeFailed";

  // StrictMode can finish a cancelled open after replacement setup; it must not close or pre-type into that
  // session.
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- opens the setup PTY, types the command into it, and closes it on cleanup
  useEffect(() => {
    const generation = setupGenerationRef.current + 1;
    setupGenerationRef.current = generation;
    activeSetupGenerationRef.current = generation;
    // oxlint-disable-next-line react/set-state-in-effect -- A retry or a new command reopens the terminal, which shows as preparing until the open settles.
    setSetupState("preparing");

    setupQueueRef.current = setupQueueRef.current.then(async () => {
      if (activeSetupGenerationRef.current !== generation) return;
      if (!readEnvironmentScope(environmentId, AuthTerminalOperateScope)) {
        setSetupState("openFailed");
        return;
      }
      const opened = await openTerminal({
        environmentId,
        input: {
          threadId: AGENT_ONBOARDING_THREAD_ID,
          terminalId,
          cwd,
          providerInstanceId,
        },
      });
      if (opened._tag !== "Success") {
        if (activeSetupGenerationRef.current === generation) setSetupState("openFailed");
        return;
      }

      if (activeSetupGenerationRef.current !== generation) return;
      if (!readEnvironmentScope(environmentId, AuthTerminalOperateScope)) {
        setSetupState("writeFailed");
        return;
      }

      const wrote = await writeTerminal({
        environmentId,
        input: { threadId: AGENT_ONBOARDING_THREAD_ID, terminalId, data: command },
      });
      if (activeSetupGenerationRef.current !== generation) return;
      setSetupState(wrote._tag === "Success" ? "ready" : "writeFailed");
    });

    // Revocation leaves the PTY running; close only while terminal access remains.
    return () => {
      if (activeSetupGenerationRef.current === generation) {
        activeSetupGenerationRef.current = null;
      }
      setupQueueRef.current = setupQueueRef.current.then(async () => {
        if (!readEnvironmentScope(environmentId, AuthTerminalOperateScope)) return;
        await closeTerminal({
          environmentId,
          input: { threadId: AGENT_ONBOARDING_THREAD_ID, terminalId, deleteHistory: true },
        });
      });
    };
  }, [
    closeTerminal,
    command,
    cwd,
    environmentId,
    openTerminal,
    providerInstanceId,
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Retry bumps setupAttempt to open the terminal again.
    setupAttempt,
    terminalId,
    writeTerminal,
  ]);

  return (
    <div
      data-thread-terminal-drawer
      className="mt-4 overflow-hidden rounded-lg border border-border/70 bg-background text-foreground"
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-3 py-1.5">
        <span className="text-2xs font-medium text-muted-foreground">
          {!canOperateTerminal ? (
            onboardingKo.cannotControlTerminals
          ) : setupState === "writeFailed" ? (
            <>
              {onboardingKo.runCommandBefore}{" "}
              <code className="rounded bg-muted px-1 font-mono">{command}</code>
              {onboardingKo.runCommandAfter}
            </>
          ) : setupState === "ready" ? (
            onboardingKo.reviewCommand
          ) : setupState === "openFailed" ? (
            onboardingKo.terminalFailed
          ) : (
            onboardingKo.preparingCommand
          )}
        </span>
        <div className="flex items-center gap-1">
          {setupState === "openFailed" ? (
            <Button
              size="xs"
              variant="ghost"
              disabled={!canOperateTerminal}
              onClick={() => {
                if (readEnvironmentScope(environmentId, AuthTerminalOperateScope)) {
                  setSetupAttempt((value) => value + 1);
                }
              }}
            >
              {onboardingKo.retry}
            </Button>
          ) : null}
          <Button size="xs" variant="ghost-muted" onClick={onClose}>
            {onboardingKo.close}
          </Button>
        </div>
      </div>
      <div className="h-64">
        {terminalReady ? (
          <TerminalViewport
            threadRef={threadRef}
            threadId={AGENT_ONBOARDING_THREAD_ID}
            terminalId={terminalId}
            terminalLabel={onboardingKo.installDriver(driver)}
            cwd={cwd}
            providerInstanceId={providerInstanceId}
            advancedTypography={advancedTypography}
            onSessionExited={onClose}
            autoFocus
            visible
            keybindings={keybindings}
          />
        ) : null}
      </div>
    </div>
  );
}

/** The desktop app links `liverary` on a fresh install; this puts its folder on PATH when it is not. */
function CliPathSetup() {
  const { state, busy, run } = useDesktopCliCommand();
  const setup = state?.pathSetup;
  if (!setup) return null;
  return (
    <div className="flex min-h-10 items-center gap-3">
      <RowIcon>
        <TerminalIcon className="size-4" />
      </RowIcon>
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">
        {setup.added ? (
          <>{onboardingKo.cliPathAdded(setup.file)}</>
        ) : (
          <>{onboardingKo.cliPathOffer(setup.file)}</>
        )}
      </p>
      {setup.added ? null : (
        <Button size="xs" variant="outline" disabled={busy} onClick={() => run("addToPath")}>
          {onboardingKo["Add to PATH"]}
        </Button>
      )}
    </div>
  );
}
