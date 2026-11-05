import { AuthOrchestrationOperateScope } from "@t3tools/contracts";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { canMaintainEnvironment, findEnvironmentUpdate } from "./environment-maintenance";

afterEach(() => vi.unstubAllGlobals());

describe("environment maintenance access", () => {
  it("requires a connected authenticated session with operate permission", () => {
    const session = {
      authenticated: true,
      auth: {
        policy: "remote-reachable" as const,
        bootstrapMethods: [],
        sessionMethods: [],
        sessionCookieName: "session",
      },
      scopes: [AuthOrchestrationOperateScope],
    };
    expect(canMaintainEnvironment(session, true)).toBe(true);
    expect(canMaintainEnvironment(session, false)).toBe(false);
    expect(canMaintainEnvironment({ ...session, authenticated: false }, true)).toBe(false);
    expect(canMaintainEnvironment({ ...session, scopes: [] }, true)).toBe(false);
    const { scopes: _, ...legacy } = session;
    expect(canMaintainEnvironment(legacy, true)).toBe(false);
    expect(canMaintainEnvironment(null, true)).toBe(false);
  });

  it.each([
    { permissions: ["environment:maintain"], expected: true },
    { permissions: ["providers:manage"], expected: false },
    { permissions: [], expected: false },
  ] as const)(
    "honors exact permissions over legacy scopes: $permissions",
    ({ permissions, expected }) => {
      expect(
        canMaintainEnvironment(
          {
            authenticated: true,
            auth: {
              policy: "remote-reachable",
              bootstrapMethods: [],
              sessionMethods: [],
              sessionCookieName: "session",
              serverUpdateScope: "environment:maintain",
            },
            scopes: ["orchestration:operate"],
            permissions,
          },
          true,
        ),
      ).toBe(expected);
    },
  );
});

describe("environment release checks", () => {
  const signal = new AbortController().signal;
  it("finds newer published stable releases without using the anonymous API quota", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "https://github.com/andongmin94/Liverary/releases/latest"
          ? Response.json({ tag_name: "v1.0.1", draft: false, prerelease: false })
          : new Response(null, { status: 403 }),
      ),
    );
    expect(await findEnvironmentUpdate("1.0.0", signal)).toBe("1.0.1");
    expect(await findEnvironmentUpdate("1.0.1", signal)).toBeNull();
    expect(await findEnvironmentUpdate("1.0.2", signal)).toBeNull();
  });

  it("reports failed checks instead of claiming the server is current", async () => {
    for (const status of [403, 429]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
      await expect(findEnvironmentUpdate("1.0.0", signal)).rejects.toThrow(String(status));
    }
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ tag_name: "v1.0.1", prerelease: true })),
    );
    await expect(findEnvironmentUpdate("1.0.0", signal)).rejects.toThrow(
      "No published stable release",
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "invalid" })));
    await expect(findEnvironmentUpdate("1.0.0", signal)).rejects.toThrow();
  });
});
