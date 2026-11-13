import { settingsText } from "~/locales/ko/settings";
import { Link } from "@tanstack/react-router";

import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { ScopedSwitch } from "./ScopedSwitch";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";
import { useSettingsScope } from "./SettingsScopeContext";

/** Features still settling in. */
export function LabsSettingsPanel() {
  return (
    <SettingsPageContainer>
      <SettingsSection id="beta" title={settingsText["Beta"]}>
        <BoringSidebarRow />
        <StopGuestSharingRow />
        <LinkedEnvironmentsRow />
        <PromptSuggestionsRow />
        <SimlockHostsRow />
        <FastWorktreeCheckoutRow />
      </SettingsSection>
    </SettingsPageContainer>
  );
}

function BoringSidebarRow() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      {...searchableSetting("boring-sidebar")}
      description={
        settingsText[
          "Group sidebar threads into project folders. Pinned threads stay on top, and Snoozed and Settled stay below the folders."
        ]
      }
      control={
        <Switch
          checked={settings.boringSidebarEnabled}
          onCheckedChange={(checked) => updateSettings({ boringSidebarEnabled: Boolean(checked) })}
          aria-label={settingsText["Boring sidebar (group by project)"]}
        />
      }
    >
      {settings.boringSidebarEnabled ? (
        <div className="mt-2 mb-2 border-l-2 border-border/60 ps-3">
          <BoringSidebarMultilineRow />
        </div>
      ) : null}
    </SettingsRow>
  );
}

function BoringSidebarMultilineRow() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      {...searchableSetting("boring-sidebar-multiline")}
      className="px-0 py-2 sm:px-0"
      description={
        settingsText[
          "Show folder threads on two lines: the title, then the branch, pull request, and agent."
        ]
      }
      control={
        <Switch
          checked={settings.boringSidebarMultilineRows}
          onCheckedChange={(checked) =>
            updateSettings({ boringSidebarMultilineRows: Boolean(checked) })
          }
          aria-label={settingsText["Two-line folder rows"]}
        />
      }
    />
  );
}

function StopGuestSharingRow() {
  const { targets } = useSettingsScope();
  const updateSettings = useUpdateScopedSettings();
  if (!targets.some((target) => target.settings.guestSharingEnabled)) return null;
  return (
    <SettingsRow
      serverScoped
      title={settingsText["Guest links"]}
      settingKeys={["guestSharingEnabled"]}
      description={settingsText["Stop all active guest links in the selected environments."]}
      control={
        <Button
          size="sm"
          variant="destructive-outline"
          onClick={() => updateSettings({ guestSharingEnabled: false })}
        >
          {settingsText["Stop all guest sharing"]}
        </Button>
      }
    />
  );
}

function LinkedEnvironmentsRow() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      serverScoped
      {...searchableSetting("linked-environments-beta")}
      settingKeys={["linkedEnvironmentsEnabled"]}
      description={
        <>
          {
            settingsText[
              "Let agents here work on your other machines, and theirs here. Turn it on for each machine, then link them in"
            ]
          }{" "}
          <Link to="/settings/connections" className="underline underline-offset-2">
            {settingsText["Connections"]}
          </Link>
          {settingsText[". While off, nothing new starts over a link; running tasks finish."]}
        </>
      }
      control={
        <ScopedSwitch
          settingKeys={["linkedEnvironmentsEnabled"]}
          checked={settings.linkedEnvironmentsEnabled}
          onCheckedChange={(checked) =>
            updateSettings({ linkedEnvironmentsEnabled: Boolean(checked) })
          }
          aria-label={settingsText["Linked environments"]}
        />
      }
    />
  );
}

function PromptSuggestionsRow() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      serverScoped
      {...searchableSetting("prompt-suggestions-beta")}
      settingKeys={["promptSuggestionsEnabled"]}
      description={
        settingsText[
          "Show a predicted next message in the empty composer after a Claude or Codex turn. Tab uses it. Each is an extra cached request on your plan. Needs Codex 0.165+. Claude threads update on restart."
        ]
      }
      control={
        <ScopedSwitch
          settingKeys={["promptSuggestionsEnabled"]}
          checked={settings.promptSuggestionsEnabled}
          onCheckedChange={(checked) =>
            updateSettings({ promptSuggestionsEnabled: Boolean(checked) })
          }
          aria-label={settingsText["Suggest next prompt"]}
        />
      }
    />
  );
}

function SimlockHostsRow() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      serverScoped
      {...searchableSetting("simlock-hosts")}
      settingKeys={["simlockDeviceHostsEnabled"]}
      description={
        <>
          {settingsText["Let the Device panel lease simulators and emulators from your own"]}{" "}
          <a
            href="https://incubator.callstack.com/simlock/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Simlock
          </a>{" "}
          {settingsText["pool, added in"]}{" "}
          <Link to="/settings/devices" className="underline underline-offset-2">
            {settingsText["Devices"]}
          </Link>
          {settingsText[". An alpha that may change or break. Liverary never installs Simlock."]}
        </>
      }
      control={
        <ScopedSwitch
          settingKeys={["simlockDeviceHostsEnabled"]}
          checked={settings.simlockDeviceHostsEnabled}
          onCheckedChange={(checked) =>
            updateSettings({ simlockDeviceHostsEnabled: Boolean(checked) })
          }
          aria-label={settingsText["Simlock device hosts"]}
        />
      }
    />
  );
}

/** Shows only when every machine in scope is a Mac, since only macOS servers honor it. */
function FastWorktreeCheckoutRow() {
  const { scope, connectedEnvironments } = useSettingsScope();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  if (
    scope.kind === "project" ||
    scope.kind === "checkout" ||
    connectedEnvironments.length === 0 ||
    connectedEnvironments.some(
      (environment) =>
        environment.serverConfig?.environment.capabilities.fastWorktreeCheckout !== true,
    )
  )
    return null;
  return (
    <SettingsRow
      serverScoped
      {...searchableSetting("worktree-fast-checkout")}
      settingKeys={["fastWorktreeCheckout"]}
      description={
        settingsText[
          "On a Mac, clone new worktrees from a checkout cached in the T3 home folder instead of writing every file. Uses Git’s normal checkout when it can’t. Turning it off deletes the cache."
        ]
      }
      control={
        <ScopedSwitch
          settingKeys={["fastWorktreeCheckout"]}
          checked={settings.fastWorktreeCheckout}
          onCheckedChange={(checked) => updateSettings({ fastWorktreeCheckout: Boolean(checked) })}
          aria-label={settingsText["Fast worktree checkout"]}
        />
      }
    />
  );
}
