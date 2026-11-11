import { chatKo } from "~/locales/ko/chat";
import { useAtomValue } from "@effect/atom-react";
import { useNavigate } from "@tanstack/react-router";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import {
  isLiveraryUpdateProvider,
  type EnvironmentId,
  type ModelSelection,
  type ProjectId,
  type ThreadId,
} from "@t3tools/contracts";
import { useRef, useState } from "react";

import { openCommandPalette } from "~/commandPaletteBus";
import { useEnvironmentSettings } from "~/hooks/useSettings";
import { upstreamUpdateKo } from "~/locales/ko/upstreamUpdate";
import { getCustomModelOptionsByInstance } from "~/modelSelection";
import { getDefaultProviderInstanceModel, providerInstanceEntriesFor } from "~/providerInstances";
import { useProjects } from "~/state/entities";
import {
  type EnvironmentPresentation,
  useEnvironments,
  usePrimaryEnvironmentId,
} from "~/state/environments";
import { useEnvironmentQuery } from "~/state/query";
import { EMPTY_SERVER_PROVIDERS, serverEnvironment } from "~/state/server";
import { useAtomCommand } from "~/state/use-atom-command";
import { ProviderModelPicker } from "./chat/ProviderModelPicker";
import { ComposerEffortColumn, ComposerSpeedControl } from "./chat/ComposerModelEffort";
import type { TraitsSelectionInput } from "./chat/TraitsPicker";
import { getProviderModelCapabilities } from "~/providerModels";
import { withImplicitFastModeDefault } from "./chat/composerProviderState";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "./ui/select";
import { stackedThreadToast, toastManager } from "./ui/toast";

export function UpstreamUpdateDialog({ onClose }: { readonly onClose: () => void }) {
  const { environments } = useEnvironments();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const [chosenEnvironmentId, setChosenEnvironmentId] = useState<EnvironmentId | null>(null);
  const [launching, setLaunching] = useState(false);
  const connectedEnvironments = environments.filter(
    (environment) =>
      environment.connection.phase === "connected" && environment.serverConfig !== null,
  );
  const selectedEnvironment =
    connectedEnvironments.find(
      (environment) => environment.environmentId === chosenEnvironmentId,
    ) ??
    connectedEnvironments.find(
      (environment) => environment.environmentId === primaryEnvironmentId,
    ) ??
    connectedEnvironments[0];

  return (
    <Dialog open onOpenChange={(open) => !open && !launching && onClose()}>
      <DialogPopup showCloseButton={!launching}>
        <DialogHeader>
          <DialogTitle>{upstreamUpdateKo.title}</DialogTitle>
          <DialogDescription>{upstreamUpdateKo.description}</DialogDescription>
        </DialogHeader>
        {selectedEnvironment ? (
          <UpstreamUpdateContent
            key={selectedEnvironment.environmentId}
            environment={selectedEnvironment}
            environments={connectedEnvironments}
            onEnvironmentChange={setChosenEnvironmentId}
            launching={launching}
            onLaunchingChange={setLaunching}
            onClose={onClose}
          />
        ) : (
          <>
            <DialogPanel>
              <p className="text-sm" role="status">
                {upstreamUpdateKo.noEnvironment}
              </p>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {upstreamUpdateKo.close}
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}

function UpstreamUpdateContent({
  environment,
  environments,
  onEnvironmentChange,
  launching,
  onLaunchingChange,
  onClose,
}: {
  readonly environment: EnvironmentPresentation;
  readonly environments: ReadonlyArray<EnvironmentPresentation>;
  readonly onEnvironmentChange: (environmentId: EnvironmentId) => void;
  readonly launching: boolean;
  readonly onLaunchingChange: (launching: boolean) => void;
  readonly onClose: () => void;
}) {
  const environmentId = environment.environmentId;
  const query = useEnvironmentQuery(
    serverEnvironment.checkUpstreamUpdate({ environmentId, input: {} }),
  );
  const launch = useAtomCommand(serverEnvironment.launchUpstreamUpdate, {
    label: chatKo["Liverary upstream update"],
    reportFailure: false,
  });
  const canLaunch = useAtomValue(
    serverEnvironment.launchUpstreamUpdate.permissionAtom(environmentId),
  );
  const projects = useProjects().filter(
    (project) => project.environmentId === environmentId && project.archivedAt == null,
  );
  const settings = useEnvironmentSettings(environmentId);
  const providers =
    useAtomValue(serverEnvironment.providersValueAtom(environmentId)) ?? EMPTY_SERVER_PROVIDERS;
  const [projectId, setProjectId] = useState<ProjectId | null>(null);
  const [chosenModel, setChosenModel] = useState<ModelSelection | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const submissionPending = useRef(false);
  const navigate = useNavigate();
  const selectedProject = projects.find((project) => project.id === projectId);
  const entries = providerInstanceEntriesFor(providers, settings, projectId).filter((entry) =>
    isLiveraryUpdateProvider({ ...entry.snapshot, enabled: entry.enabled }),
  );
  const selectedEntry =
    entries.find((entry) => entry.instanceId === chosenModel?.instanceId) ?? entries[0];
  const modelSelection = selectedEntry
    ? chosenModel?.instanceId === selectedEntry.instanceId
      ? chosenModel
      : {
          instanceId: selectedEntry.instanceId,
          model: getDefaultProviderInstanceModel(providers, selectedEntry.instanceId) ?? "",
        }
    : null;
  const modelOptions = getCustomModelOptionsByInstance(
    settings,
    providers,
    modelSelection?.instanceId,
    modelSelection?.model,
  );
  const traitsInput: TraitsSelectionInput | null =
    selectedEntry && modelSelection
      ? {
          provider: selectedEntry.driverKind,
          instanceId: selectedEntry.instanceId,
          models: selectedEntry.snapshot.models,
          model: modelSelection.model,
          modelOptions: withImplicitFastModeDefault(
            getProviderModelCapabilities(
              selectedEntry.snapshot.models,
              modelSelection.model,
              selectedEntry.driverKind,
            ),
            modelSelection.options,
          ),
          reportedModelSelection: null,
          promptUltrathink: "none",
          onModelOptionsChange: (options) =>
            setChosenModel({
              instanceId: modelSelection.instanceId,
              model: modelSelection.model,
              ...(options === undefined ? {} : { options }),
            }),
        }
      : null;
  const modelAvailable =
    modelSelection !== null &&
    modelOptions
      .get(modelSelection.instanceId)
      ?.some((model) => model.slug === modelSelection.model && !model.isUnavailable) === true;
  const result = query.data;
  const needsUpdate = result !== null && result.status !== "up-to-date";
  const supportsThreadLookup =
    environment.serverConfig?.environment.capabilities.upstreamUpdateThreadLookup === true;
  const threadQuery = useEnvironmentQuery(
    supportsThreadLookup && selectedProject && result && needsUpdate
      ? serverEnvironment.upstreamUpdateThread({
          environmentId,
          input: {
            projectId: selectedProject.id,
            upstreamSha: result.upstream.sha,
            publishedSha: result.published.sha,
          },
        })
      : null,
  );
  const threadChecked =
    !supportsThreadLookup ||
    (threadQuery.isSuccess && !threadQuery.isPending && threadQuery.error === null);
  const existingThread = threadQuery.error === null ? threadQuery.data : null;
  const existingThreadId = existingThread?.threadId ?? null;
  const preparationModel = existingThread?.preparationModel ?? null;

  const openThread = (threadId: ThreadId) => {
    onClose();
    void navigate({ to: "/$environmentId/$threadId", params: { environmentId, threadId } });
  };

  const submit = async () => {
    const launchModel = preparationModel ?? modelSelection;
    if (
      submissionPending.current ||
      launching ||
      !canLaunch ||
      !selectedProject ||
      !launchModel ||
      (preparationModel === null && (!modelAvailable || existingThreadId !== null)) ||
      !threadChecked ||
      !needsUpdate ||
      query.isPending ||
      query.error
    )
      return;
    submissionPending.current = true;
    onLaunchingChange(true);
    setLaunchError(null);
    const launched = await launch({
      environmentId,
      input: {
        projectId: selectedProject.id,
        modelSelection: launchModel,
        upstreamSha: result.upstream.sha,
        ...(existingThreadId === null ? {} : { expectedThreadId: existingThreadId }),
      },
    });
    if (launched._tag === "Failure") {
      submissionPending.current = false;
      onLaunchingChange(false);
      if (!isAtomCommandInterrupted(launched)) {
        const error = squashAtomCommandFailure(launched);
        setLaunchError(error instanceof Error ? error.message : String(error));
      }
      return;
    }
    if (launched.value.resumed) {
      toastManager.add(
        stackedThreadToast({
          type: "info",
          title: upstreamUpdateKo.resumed,
          description: upstreamUpdateKo.resumedDescription,
        }),
      );
    }
    openThread(launched.value.threadId);
  };

  return (
    <>
      <DialogPanel>
        <div className="space-y-5">
          {query.isPending ? (
            <p className="text-sm" role="status">
              {upstreamUpdateKo.checking}
            </p>
          ) : query.error ? (
            <div className="space-y-1 text-sm text-destructive" role="alert">
              <p>{upstreamUpdateKo.checkFailed}</p>
              <p>{query.error}</p>
            </div>
          ) : result ? (
            <div className="space-y-3">
              <p className="text-sm" role="status">
                {result.status === "up-to-date"
                  ? upstreamUpdateKo.upToDate
                  : result.status === "pending"
                    ? upstreamUpdateKo.pending
                    : upstreamUpdateKo.available(result.upstream.tag)}
              </p>
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">{upstreamUpdateKo.upstreamRelease}</dt>
                <dd>
                  <a
                    href={result.upstream.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {result.upstream.tag}
                  </a>
                </dd>
                <dt className="text-muted-foreground">{upstreamUpdateKo.publishedRelease}</dt>
                <dd>
                  <a
                    href={result.published.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {result.published.tag}
                  </a>
                </dd>
              </dl>
            </div>
          ) : null}

          {(needsUpdate || query.error) && environments.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="upstream-update-environment">{upstreamUpdateKo.environment}</Label>
              <Select
                value={environmentId}
                disabled={launching}
                onValueChange={(id) => {
                  const next = environments.find((entry) => entry.environmentId === id);
                  if (next) onEnvironmentChange(next.environmentId);
                }}
              >
                <SelectTrigger id="upstream-update-environment">
                  <SelectValue>{environment.label}</SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {environments.map((entry) => (
                    <SelectItem key={entry.environmentId} value={entry.environmentId}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          ) : null}

          {needsUpdate && !query.isPending && !query.error ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="upstream-update-project">{upstreamUpdateKo.project}</Label>
                {projects.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{upstreamUpdateKo.noProject}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        openCommandPalette({ open: "add-project" });
                      }}
                    >
                      {upstreamUpdateKo.addProject}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedProject?.id ?? null}
                      disabled={launching}
                      onValueChange={(id) => {
                        setProjectId(projects.find((project) => project.id === id)?.id ?? null);
                        setLaunchError(null);
                      }}
                    >
                      <SelectTrigger id="upstream-update-project">
                        <SelectValue placeholder={upstreamUpdateKo.chooseProject}>
                          {selectedProject?.title}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectPopup>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id} label={project.title}>
                            <span className="block truncate">{project.title}</span>
                            <span className="block max-w-72 truncate text-xs text-muted-foreground">
                              {project.workspaceRoot}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                    {selectedProject ? (
                      <p className="break-all text-xs text-muted-foreground">
                        {selectedProject.workspaceRoot}
                      </p>
                    ) : null}
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  {upstreamUpdateKo.projectDescription}
                </p>
              </div>

              {threadQuery.isPending ? (
                <p className="text-sm" role="status">
                  {upstreamUpdateKo.checkingThread}
                </p>
              ) : threadQuery.error ? (
                <div className="space-y-1 text-sm text-destructive" role="alert">
                  <p>{upstreamUpdateKo.threadCheckFailed}</p>
                  <p>{threadQuery.error}</p>
                </div>
              ) : existingThreadId !== null ? (
                <p className="text-sm text-muted-foreground">
                  {preparationModel !== null && canLaunch
                    ? upstreamUpdateKo.preparationDescription
                    : upstreamUpdateKo.existingThreadDescription}
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{upstreamUpdateKo.providerModel}</Label>
                    {selectedEntry && modelSelection ? (
                      <ProviderModelPicker
                        environmentId={environmentId}
                        activeInstanceId={selectedEntry.instanceId}
                        model={modelSelection.model}
                        lockedProvider={null}
                        instanceEntries={entries}
                        modelOptionsByInstance={modelOptions}
                        isComposerOwned={false}
                        disabled={launching || !selectedProject}
                        triggerAriaLabel={upstreamUpdateKo.providerModel}
                        effortColumn={<ComposerEffortColumn traits={traitsInput} />}
                        footer={
                          <div className="flex items-center gap-2 border-t border-border/70 bg-muted/40 px-3 py-2">
                            {traitsInput ? <ComposerSpeedControl traits={traitsInput} /> : null}
                          </div>
                        }
                        onInstanceModelChange={(instanceId, model) =>
                          setChosenModel({ instanceId, model })
                        }
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{upstreamUpdateKo.noProvider}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {upstreamUpdateKo.launchDescription}
                  </p>
                  {!canLaunch ? (
                    <p className="text-sm text-destructive">
                      {upstreamUpdateKo.permissionRequired}
                    </p>
                  ) : null}
                </>
              )}
            </>
          ) : null}

          {launchError ? (
            <div className="space-y-1 text-sm text-destructive" role="alert">
              <p>{upstreamUpdateKo.launchFailed}</p>
              <p>{launchError}</p>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">{upstreamUpdateKo.binaryDescription}</p>
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" disabled={launching} />}>
          {upstreamUpdateKo.close}
        </DialogClose>
        <Button
          variant="outline"
          disabled={query.isPending || threadQuery.isPending || launching}
          onClick={() => {
            setLaunchError(null);
            query.refresh();
            threadQuery.refresh();
          }}
        >
          {upstreamUpdateKo.retry}
        </Button>
        {needsUpdate && !query.error && existingThreadId !== null ? (
          <Button
            variant={preparationModel !== null && canLaunch ? "outline" : "default"}
            disabled={launching || query.isPending || !threadChecked}
            onClick={() => threadChecked && openThread(existingThreadId)}
          >
            {upstreamUpdateKo.openThread}
          </Button>
        ) : null}
        {needsUpdate &&
        !query.error &&
        (existingThreadId === null || (preparationModel !== null && canLaunch)) ? (
          <Button
            disabled={
              launching ||
              query.isPending ||
              !canLaunch ||
              !selectedProject ||
              (preparationModel === null && !modelAvailable) ||
              !threadChecked
            }
            onClick={() => void submit()}
          >
            {launching
              ? upstreamUpdateKo.launching
              : preparationModel !== null
                ? upstreamUpdateKo.retryPreparation
                : upstreamUpdateKo.launch}
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}
