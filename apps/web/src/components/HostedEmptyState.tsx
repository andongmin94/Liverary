import { chatKo } from "~/locales/ko/chat";
import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";

import { APP_DISPLAY_NAME, DESKTOP_DOWNLOAD_URL } from "~/branding";
import { onboardingKo } from "~/locales/ko/onboarding";
import { isElectron } from "../env";
import { isLocalEnvironmentDisabled } from "../localEnvironment";
import { InstallT3Commands } from "./InstallT3Commands";
import { Button } from "./ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";
import { SidebarInset } from "./ui/sidebar";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

/** Home screen for the hosted app before any computer is added. */
export function HostedEmptyState() {
  const localEnvironmentOff = isLocalEnvironmentDisabled();

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <WorkspacePageHeader electron={isElectron} className="border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground md:text-muted-foreground/60">
              {APP_DISPLAY_NAME}
            </span>
          </div>
        </WorkspacePageHeader>

        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyTitle>
              {localEnvironmentOff
                ? chatKo["This computer is off"]
                : chatKo["No computer connected"]}
            </EmptyTitle>
            <EmptyDescription>
              {localEnvironmentOff
                ? chatKo["Turn it back on, or connect a different computer."]
                : chatKo["Your agents run on your computer. Start Liverary there first."]}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {localEnvironmentOff ? (
              <Button render={<Link to="/settings/connections" />} size="sm">
                {chatKo["Open Environments"]}
              </Button>
            ) : (
              <ol className="w-full space-y-4 text-left">
                <PairingSteps />
              </ol>
            )}
          </EmptyContent>
        </Empty>
      </div>
    </SidebarInset>
  );
}

function PairingSteps() {
  return (
    <>
      <SetupStep number={1}>
        <RunOnComputer command="liverary pair" />
      </SetupStep>
      <SetupStep number={2}>
        <Button render={<Link to="/settings/connections" />} size="sm">
          {chatKo["Add pairing link"]}
        </Button>
      </SetupStep>
    </>
  );
}

function SetupStep({
  number,
  children,
}: {
  readonly number: number;
  readonly children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="w-2 shrink-0 pt-1 text-muted-foreground">{number}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

function RunOnComputer({ command }: { readonly command: string }) {
  return (
    <>
      <p>{onboardingKo.runOnComputers}</p>
      <InstallT3Commands command={command} className="mt-2" />
      <p className="mt-2 text-xs text-muted-foreground">{onboardingKo.cliSetupHint}</p>
      <a
        className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        href={DESKTOP_DOWNLOAD_URL}
        target="_blank"
        rel="noreferrer noopener"
      >
        {onboardingKo.downloadLiverary}
      </a>
    </>
  );
}
