import type { ProviderDriverKind, ServerProvider } from "@t3tools/contracts";

import type { ProviderInstance } from "@t3tools/provider-core/server/driver";
import type { ServerProviderDraft } from "@t3tools/provider-core/server/snapshotProbe";

export const withInstanceIdentity =
  (input: {
    readonly instanceId: ProviderInstance["instanceId"];
    readonly driverKind: ProviderDriverKind;
    readonly displayName: string | undefined;
    readonly accentColor: string | undefined;
    readonly continuationGroupKey: string;
    readonly resolvedBinaryPath?: string | undefined;
    readonly detectedExecutables?: ServerProvider["detectedExecutables"];
  }) =>
  (snapshot: ServerProviderDraft): ServerProvider => ({
    ...snapshot,
    instanceId: input.instanceId,
    driver: input.driverKind,
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.accentColor ? { accentColor: input.accentColor } : {}),
    ...(input.resolvedBinaryPath ? { resolvedBinaryPath: input.resolvedBinaryPath } : {}),
    ...(input.detectedExecutables ? { detectedExecutables: input.detectedExecutables } : {}),
    continuation: { groupKey: input.continuationGroupKey },
  });
