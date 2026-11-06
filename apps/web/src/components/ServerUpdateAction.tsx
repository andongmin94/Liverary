import { chatMessages } from "~/locales/ko/chatMessages";
import { chatKo } from "~/locales/ko/chat";
import { managedUpdatesDenial } from "~/locales/ko/managedPolicy";
import { useAtomValue } from "@effect/atom-react";
import {
  AuthEnvironmentMaintainScope,
  type AuthSessionState,
  sessionGrantsScope,
} from "@t3tools/contracts";
import type { AsyncResult } from "effect/reactivity";
import { environmentSession } from "~/state/session";
import type {
  EnvironmentId,
  ServerInstallation,
  ServerSelfUpdateCapability,
} from "@t3tools/contracts";
import type { ServerUpdateStage, ServerUpdateState } from "@t3tools/client-runtime/state/server";
import {
  isAtomCommandInterrupted,
  settlePromise,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { CircleArrowUpIcon } from "lucide-react";
import { type ComponentProps, useRef, useState } from "react";

import { requestConfirmDialog } from "~/confirmDialog";
import { DESKTOP_DOWNLOAD_URL } from "~/branding";
import { ensureLocalApi } from "~/localApi";
import { upstreamUpdateKo } from "~/locales/ko/upstreamUpdate";
import { serverEnvironment, updateOutdatedServer } from "~/state/server";
import { appAtomRegistry } from "~/rpc/atomRegistry";
import { useAtomCommand } from "~/state/use-atom-command";
import { useServerConfigs } from "~/state/entities";
import { useManagedPolicy } from "~/state/managedPolicy";
import { environmentPresentations } from "~/state/presentation";
import { ManagedControl } from "./ManagedPolicy";
import { Button } from "./ui/button";
import { toastManager } from "./ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

const UPDATE_STAGE_LABELS: Record<ServerUpdateStage, string> = {
  downloading: chatKo["Downloading…"],
  installing: chatKo["Downloading…"],
  resuming: chatKo["Restarting…"],
};
const pendingUpdateEnvironmentIds = new Set<EnvironmentId>();

export function serverUpdateStageLabel(stage: ServerUpdateStage): string {
  return UPDATE_STAGE_LABELS[stage];
}

/** Why the environment's policy refuses server updates, read outside render. */
function readUpdatesDenial(environmentId: EnvironmentId): string | undefined {
  return managedUpdatesDenial(
    appAtomRegistry.get(environmentPresentations.serverConfigsAtom).get(environmentId)
      ?.managedPolicy,
  );
}

function updateFailureMessage(error: unknown): string {
  return error instanceof Error ? error.message : chatKo["Server update failed."];
}

export interface ServerUpdateTarget {
  readonly environmentId: EnvironmentId;
  readonly serverLabel: string;
  readonly selfUpdate: ServerSelfUpdateCapability | null;
  readonly installation?: ServerInstallation | undefined;
  readonly desktopAppUpdate?: boolean;
  readonly targetVersion: string;
}

type UpdateButtonProps = Pick<ComponentProps<typeof Button>, "variant" | "size" | "className"> & {
  readonly label?: string;
  readonly appearance?: "button" | "icon";
};

export type ServerUpdateOutcome =
  | { readonly status: "updated" | "skipped" }
  | { readonly status: "failed"; readonly message: string };

/** Toasts its success or failure unless `quiet`; never rejects. */
export function useServerUpdate() {
  const updateServer = useAtomCommand(serverEnvironment.updateServer, { reportFailure: false });
  return async (
    target: ServerUpdateTarget,
    { quiet = false }: { readonly quiet?: boolean } = {},
  ): Promise<ServerUpdateOutcome> => {
    const { environmentId, serverLabel, selfUpdate, targetVersion } = target;
    const denial = readUpdatesDenial(environmentId);
    if (denial !== undefined) {
      if (!quiet) {
        toastManager.add({
          type: "error",
          title: chatKo.serverNotUpdated(serverLabel),
          description: denial,
        });
      }
      return { status: "failed", message: denial };
    }
    if (
      !canUpdateServer(appAtomRegistry.get(environmentSession.sessionStateAtom(environmentId))) ||
      pendingUpdateEnvironmentIds.has(environmentId)
    )
      return { status: "skipped" };
    pendingUpdateEnvironmentIds.add(environmentId);
    const result = await updateServer({
      environmentId,
      input: { targetVersion },
    });
    pendingUpdateEnvironmentIds.delete(environmentId);
    if (result._tag === "Failure") {
      if (isAtomCommandInterrupted(result)) return { status: "skipped" };
      const message = updateFailureMessage(squashAtomCommandFailure(result));
      if (!quiet) {
        toastManager.add({
          type: "error",
          title: chatMessages.serverUpdateFailed(serverLabel),
          description: message,
        });
      }
      return { status: "failed", message };
    }
    if (!quiet) {
      toastManager.add({
        type: "success",
        title: chatMessages.serverUpdated(serverLabel),
        description:
          selfUpdate === "desktop-managed"
            ? chatMessages.desktopRelaunchedAt(result.value.targetVersion)
            : chatMessages.reconnectedAt(result.value.targetVersion),
      });
    }
    return { status: "updated" };
  };
}

export function ServerUpdatesAction({
  targets,
  label = chatKo["Update all"],
  variant = "outline",
  size = "xs",
  className,
}: UpdateButtonProps & {
  readonly targets: ReadonlyArray<ServerUpdateTarget>;
}) {
  const update = useServerUpdate();
  const serverConfigs = useServerConfigs();
  const pending = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const eligible = targets.filter(
    (target) =>
      target.selfUpdate !== null &&
      (target.selfUpdate !== "desktop-managed" || target.desktopAppUpdate) &&
      managedUpdatesDenial(serverConfigs.get(target.environmentId)?.managedPolicy) === undefined,
  );
  const handleUpdate = async () => {
    if (pending.current) return;
    pending.current = true;
    setIsPending(true);
    await settlePromise(async () => {
      const available = eligible.filter(
        (target) => !pendingUpdateEnvironmentIds.has(target.environmentId),
      );
      const desktopTargets = available.filter((target) => target.selfUpdate === "desktop-managed");
      if (desktopTargets.length > 0) {
        const confirmed =
          (await requestConfirmDialog(
            chatMessages.confirmDesktopUpdates(
              desktopTargets.map((target) => target.serverLabel).join(", "),
            ),
          )) ?? true;
        if (!confirmed) return;
      }
      await Promise.all(available.map((target) => update(target)));
    });
    pending.current = false;
    setIsPending(false);
  };
  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      disabled={isPending || eligible.length === 0}
      onClick={() => void handleUpdate()}
    >
      {label}
    </Button>
  );
}

export function canUpdateServer(
  result: AsyncResult.AsyncResult<AuthSessionState, unknown>,
): boolean {
  if (result._tag !== "Success" || !result.value.authenticated) return false;
  return sessionGrantsScope(result.value, AuthEnvironmentMaintainScope);
}

export function ServerUpdateProgress({
  state,
}: {
  readonly state: Exclude<ServerUpdateState, { status: "idle" }>;
}) {
  if (state.status === "failed") {
    return (
      <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-destructive" role="alert">
        <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
        <Tooltip>
          <TooltipTrigger render={<span className="min-w-0 truncate">{state.message}</span>} />
          <TooltipPopup side="top">{state.message}</TooltipPopup>
        </Tooltip>
      </div>
    );
  }
  return (
    <div className="mt-1 flex items-center gap-2 text-xs font-medium text-foreground">
      <span className="size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
      <span>{serverUpdateStageLabel(state.stage)}</span>
    </div>
  );
}

/** client-runtime owns self-updates so unmounting during reconnect preserves operation state. */
export function ServerUpdateAction({
  environmentId,
  serverLabel,
  selfUpdate,
  desktopAppUpdate = false,
  targetVersion,
  label = chatKo["Update"],
  variant = "outline",
  size = "xs",
  className,
  appearance = "button",
}: ServerUpdateTarget & UpdateButtonProps) {
  const isDesktopAppUpdate = selfUpdate === "desktop-managed";
  const sessionStateAtom = environmentSession.sessionStateAtom(environmentId);
  const canUpdate = useAtomValue(sessionStateAtom, canUpdateServer);
  const updatesDenial = managedUpdatesDenial(useManagedPolicy(environmentId));
  const update = useServerUpdate();

  const handleUpdate = async () => {
    if (
      !canUpdateServer(appAtomRegistry.get(sessionStateAtom)) ||
      pendingUpdateEnvironmentIds.has(environmentId)
    ) {
      return;
    }
    if (isDesktopAppUpdate) {
      const confirmed =
        (await requestConfirmDialog(chatMessages.confirmDesktopUpdate(serverLabel))) ?? true;
      if (!confirmed) {
        return;
      }
    }
    if (!canUpdateServer(appAtomRegistry.get(sessionStateAtom))) return;
    await update({
      environmentId,
      serverLabel,
      selfUpdate,
      desktopAppUpdate,
      targetVersion,
    });
  };

  if (updatesDenial !== undefined) {
    return appearance === "icon" ? (
      <ManagedControl reason={updatesDenial}>
        <Button size="icon-xs" variant="ghost-muted" aria-label={updatesDenial} disabled>
          <CircleArrowUpIcon className="size-3.5" />
        </Button>
      </ManagedControl>
    ) : (
      <span className="text-muted-foreground text-xs">{updatesDenial}</span>
    );
  }

  const manualUpdateRequired = selfUpdate === null || (isDesktopAppUpdate && !desktopAppUpdate);
  const actionLabel = manualUpdateRequired ? upstreamUpdateKo.installGuide : label;
  const onClick = manualUpdateRequired
    ? () => {
        void ensureLocalApi()
          .shell.openExternal(DESKTOP_DOWNLOAD_URL)
          .catch((error: unknown) => {
            toastManager.add({
              type: "error",
              title: upstreamUpdateKo.installGuideFailed,
              description: error instanceof Error ? error.message : String(error),
            });
          });
      }
    : () => void handleUpdate();

  if (appearance === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost-muted"
              className={className}
              aria-label={chatMessages.serverAction(actionLabel, serverLabel)}
              disabled={!manualUpdateRequired && !canUpdate}
              onClick={onClick}
            />
          }
        >
          <CircleArrowUpIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipPopup side="top">{actionLabel}</TooltipPopup>
      </Tooltip>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      disabled={!manualUpdateRequired && !canUpdate}
      onClick={onClick}
    >
      {actionLabel}
    </Button>
  );
}

/** Read the host descriptor's version because the host never delivers server config. */
export function OutdatedServerUpdateAction({
  environmentId,
  serverLabel,
  fromVersion,
  targetVersion,
  label = chatKo["Update"],
}: {
  readonly environmentId: EnvironmentId;
  readonly serverLabel: string;
  readonly fromVersion: string | undefined;
  readonly targetVersion: string;
  readonly label?: string;
}) {
  const update = useAtomCommand(updateOutdatedServer, { reportFailure: false });
  const handleUpdate = async () => {
    if (pendingUpdateEnvironmentIds.has(environmentId)) return;
    pendingUpdateEnvironmentIds.add(environmentId);
    const result = await update({
      environmentId,
      input: { targetVersion },
      ...(fromVersion === undefined ? {} : { fromVersion }),
    });
    pendingUpdateEnvironmentIds.delete(environmentId);
    if (result._tag === "Failure") {
      if (isAtomCommandInterrupted(result)) return;
      toastManager.add({
        type: "error",
        title: chatMessages.serverUpdateFailed(serverLabel),
        description: updateFailureMessage(squashAtomCommandFailure(result)),
      });
      return;
    }
    toastManager.add({
      type: "success",
      title: chatMessages.serverUpdated(serverLabel),
      description: chatMessages.reconnectedAt(result.value.targetVersion),
    });
  };
  return (
    <Button size="xs" variant="outline" onClick={() => void handleUpdate()}>
      {label}
    </Button>
  );
}
