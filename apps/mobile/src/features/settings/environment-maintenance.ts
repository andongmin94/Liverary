import {
  AuthEnvironmentMaintainScope,
  sessionGrantsScope,
  type AuthSessionState,
  type ExecutionEnvironmentCapabilities,
  type ServerProvider,
} from "@t3tools/contracts";
import { CLI_RELEASES_PAGE_URL, newestCliReleaseVersion } from "@t3tools/shared/cliRelease";
import { compareSemverVersions } from "@t3tools/shared/semver";
import * as Schema from "effect/Schema";

export function canMaintainEnvironment(session: AuthSessionState | null, connected: boolean) {
  return (
    connected &&
    session?.authenticated === true &&
    sessionGrantsScope(session, AuthEnvironmentMaintainScope)
  );
}

export function supportsEnvironmentUpdate(
  capabilities: Pick<ExecutionEnvironmentCapabilities, "serverSelfUpdate" | "desktopAppUpdate">,
) {
  return (
    capabilities.serverSelfUpdate !== undefined &&
    (capabilities.serverSelfUpdate !== "desktop-managed" || capabilities.desktopAppUpdate === true)
  );
}

export function canUpdateEnvironmentProvider(provider: ServerProvider) {
  const compatibility = provider.compatibilityAdvisory?.latestVersionStatus;
  return (
    provider.installed &&
    provider.availability !== "unavailable" &&
    provider.versionAdvisory?.status === "behind_latest" &&
    provider.versionAdvisory.canUpdate &&
    provider.versionAdvisory.latestVersion !== null &&
    compatibility !== "broken" &&
    compatibility !== "unsupported" &&
    provider.updateState?.status !== "running" &&
    provider.updateState?.status !== "queued"
  );
}

const Release = Schema.Struct({
  tag_name: Schema.String,
  draft: Schema.optionalKey(Schema.Boolean),
  prerelease: Schema.optionalKey(Schema.Boolean),
});
const decodeRelease = Schema.decodeUnknownSync(Release);

export async function findEnvironmentUpdate(currentVersion: string, signal: AbortSignal) {
  // Public release pages avoid the anonymous API quota shared by devices on the same network.
  const response = await fetch(`${CLI_RELEASES_PAGE_URL}/latest`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Could not check releases (${response.status}). Try again.`);
  const version = newestCliReleaseVersion([decodeRelease(await response.json())]);

  if (version === undefined) throw new Error("No published stable release was found.");
  return compareSemverVersions(version, currentVersion) > 0 ? version : null;
}
