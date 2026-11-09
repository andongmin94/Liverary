import { AuthProvidersManageScope, ProjectId, ProviderInstanceId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  buildProviderInstanceOverridePatch,
  resolveRemoteOperateAccess,
} from "./ProviderSettingsPanel.logic";

describe("buildProviderInstanceOverridePatch", () => {
  const projectId = ProjectId.make("project-a");
  const instanceId = ProviderInstanceId.make("codex_work");

  it("writes the same choice to every checkout of the project", () => {
    const siblingId = ProjectId.make("project-a-worktree");
    expect(buildProviderInstanceOverridePatch([projectId, siblingId], instanceId, false)).toEqual({
      projectSettingsOverrides: {
        [projectId]: { providerInstances: { [instanceId]: { enabled: false } } },
        [siblingId]: { providerInstances: { [instanceId]: { enabled: false } } },
      },
    });
  });

  it("resets only the requested provider instance", () => {
    expect(buildProviderInstanceOverridePatch([projectId], instanceId, undefined)).toEqual({
      projectSettingsOverrides: { [projectId]: { providerInstances: { [instanceId]: null } } },
    });
  });
});

describe("remote operate access", () => {
  it("does not treat the old orchestration grant as provider management", () => {
    expect(
      resolveRemoteOperateAccess({
        session: {
          authenticated: true,
          scopes: ["orchestration:operate"],
          auth: { serverUpdateScope: "environment:maintain" },
        },
        isPending: false,
        hasError: false,
      }),
    ).toBe("denied");
  });

  it("accepts the orchestration grant from a server that predates providers:manage", () => {
    expect(
      resolveRemoteOperateAccess({
        session: { authenticated: true, scopes: ["orchestration:operate"], auth: {} },
        isPending: false,
        hasError: false,
      }),
    ).toBe("granted");
  });
  it("derives access from the environment session's granted scopes", () => {
    expect(
      resolveRemoteOperateAccess({
        session: { authenticated: true, scopes: [AuthProvidersManageScope] },
        isPending: false,
        hasError: false,
      }),
    ).toBe("granted");
    expect(
      resolveRemoteOperateAccess({
        session: { authenticated: true, scopes: ["orchestration:read"] },
        isPending: false,
        hasError: false,
      }),
    ).toBe("denied");
    expect(
      resolveRemoteOperateAccess({
        session: { authenticated: false },
        isPending: false,
        hasError: false,
      }),
    ).toBe("denied");
  });
});
