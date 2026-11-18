import {
  PrimaryConnectionTarget,
  RelayConnectionTarget,
  SshConnectionTarget,
} from "@t3tools/client-runtime/connection";
import { buildRemoteOpenUrl, EnvironmentId } from "@t3tools/contracts";
import * as Result from "effect/Result";
import * as Hex from "effect/encoding/Hex";
import { describe, expect, it } from "vite-plus/test";

import { resolveRemoteOpenState } from "./remoteOpen";

const environmentId = EnvironmentId.make("environment-1");

const primaryTarget = (httpBaseUrl: string) =>
  new PrimaryConnectionTarget({
    environmentId,
    label: "sol",
    httpBaseUrl,
    wsBaseUrl: httpBaseUrl.replace("http", "ws"),
  });

const TAILSCALE_TARGETS = [
  { kind: "tailscale", host: "sol.tail1234.ts.net" },
  { kind: "mdns", host: "sol.local" },
] as const;

describe("resolveRemoteOpenState", () => {
  it("keeps exec behavior for a loopback primary target", () => {
    expect(
      resolveRemoteOpenState({
        target: primaryTarget("http://127.0.0.1:8000"),
        sshTarget: null,
        isDesktopRenderer: false,
        remoteOpenTargets: TAILSCALE_TARGETS,
      }),
    ).toEqual({ mode: "local-exec" });
  });

  it("uses deep links for a primary target reached over the network", () => {
    expect(
      resolveRemoteOpenState({
        target: primaryTarget("https://sol.tail1234.ts.net"),
        sshTarget: null,
        isDesktopRenderer: false,
        remoteOpenTargets: TAILSCALE_TARGETS,
      }),
    ).toEqual({
      mode: "remote-links",
      host: { kind: "tailscale", host: "sol.tail1234.ts.net" },
    });
  });

  it("keeps exec behavior for the desktop app's own primary even on a NAT URL", () => {
    // wsl-only binds the desktop-owned primary to its WSL2 NAT address.
    expect(
      resolveRemoteOpenState({
        target: primaryTarget("http://172.29.112.1:14369"),
        sshTarget: null,
        isDesktopRenderer: true,
        remoteOpenTargets: TAILSCALE_TARGETS,
      }),
    ).toEqual({ mode: "local-exec" });
  });

  it("leaves a bare desktop SSH alias for the editor to resolve through SSH config", () => {
    const state = resolveRemoteOpenState({
      target: new SshConnectionTarget({ environmentId, label: "sol", connectionId: "ssh-1" }),
      sshTarget: { alias: "sol", username: null, port: null },
      isDesktopRenderer: true,
      remoteOpenTargets: [
        { kind: "tailscale", host: "sol.tail1234.ts.net", username: "server-user" },
      ],
    });
    expect(state).toEqual({ mode: "remote-links", host: { kind: "ssh-alias", host: "sol" } });
    if (state.mode !== "remote-links") throw new Error("Expected a remote link");
    expect(
      buildRemoteOpenUrl({ editor: "vscode", ...state.host, absolutePath: "/work/project" }),
    ).toBe("vscode://vscode-remote/ssh-remote+sol/work/project");
    expect(
      buildRemoteOpenUrl({ editor: "zed", ...state.host, absolutePath: "/work/project" }),
    ).toBe("zed://ssh/sol/work/project");
    expect(
      buildRemoteOpenUrl({ editor: "idea", ...state.host, absolutePath: "/work/project" }),
    ).toBe(
      "jetbrains://gateway/ssh/environment?h=sol&launchIde=true&ideHint=IU&projectHint=%2Fwork%2Fproject",
    );
  });

  it.each([
    { alias: "server", username: "admin-user" },
    { alias: "admin-user@server", username: null },
    { alias: "old-user@server", username: "admin-user" },
    { alias: "admin-user@server", username: "" },
    { alias: "admin-user@server", username: "  " },
  ])("keeps one login username in editor links for $alias (username: '$username')", (sshTarget) => {
    const state = resolveRemoteOpenState({
      target: new SshConnectionTarget({ environmentId, label: "server", connectionId: "ssh-1" }),
      sshTarget: { ...sshTarget, port: null },
      isDesktopRenderer: true,
      remoteOpenTargets: TAILSCALE_TARGETS,
    });
    expect(state.mode).toBe("remote-links");
    if (state.mode !== "remote-links") throw new Error("Expected a remote link");
    expect(
      buildRemoteOpenUrl({ editor: "vscode", ...state.host, absolutePath: "/work/project" }),
    ).toBe("vscode://vscode-remote/ssh-remote+admin-user%40server/work/project");
    expect(
      buildRemoteOpenUrl({ editor: "zed", ...state.host, absolutePath: "/work/project" }),
    ).toBe("zed://ssh/admin-user@server/work/project");
    expect(
      buildRemoteOpenUrl({ editor: "idea", ...state.host, absolutePath: "/work/project" }),
    ).toBe(
      "jetbrains://gateway/ssh/environment?h=server&launchIde=true&ideHint=IU&projectHint=%2Fwork%2Fproject&u=admin-user",
    );
  });

  it.each([
    {
      host: "server",
      username: "admin-user",
      port: 2222,
      zedDestination: "admin-user@server:2222",
    },
    {
      host: "192.0.2.1",
      username: null,
      port: 2200,
      zedDestination: "192.0.2.1:2200",
    },
    {
      host: "2001:db8::1",
      username: "admin-user",
      port: 2200,
      zedDestination: "admin-user@[2001:db8::1]:2200",
    },
  ])(
    "keeps explicit SSH port $port in editor links for $host",
    ({ host, username, port, zedDestination }) => {
      const state = resolveRemoteOpenState({
        target: new SshConnectionTarget({ environmentId, label: host, connectionId: "ssh-1" }),
        sshTarget: { alias: host, username, port },
        isDesktopRenderer: true,
        remoteOpenTargets: TAILSCALE_TARGETS,
      });
      expect(state).toEqual({
        mode: "remote-links",
        host: { kind: "ssh-alias", host, port, ...(username === null ? {} : { username }) },
      });
      if (state.mode !== "remote-links") throw new Error("Expected a remote link");

      for (const editor of ["vscode", "vscode-insiders", "vscodium", "cursor"] as const) {
        const url = new URL(
          buildRemoteOpenUrl({ editor, ...state.host, absolutePath: "/work/project" })!,
        );
        expect(url.protocol).toBe(`${editor}:`);
        expect(url.host).toBe("vscode-remote");
        const authority = /^\/ssh-remote\+([^/]+)\/work\/project$/.exec(url.pathname)?.[1];
        expect(authority).toBeDefined();
        expect(JSON.parse(Result.getOrThrow(Hex.decodeString(authority!)))).toEqual({
          hostName: host,
          ...(username === null ? {} : { user: username }),
          port,
        });
      }
      expect(
        buildRemoteOpenUrl({ editor: "zed", ...state.host, absolutePath: "/work/project" }),
      ).toBe(`zed://ssh/${zedDestination}/work/project`);
      const jetbrainsUrl = new URL(
        buildRemoteOpenUrl({ editor: "idea", ...state.host, absolutePath: "/work/project" })!,
      );
      expect(Object.fromEntries(jetbrainsUrl.searchParams)).toEqual({
        h: host,
        launchIde: "true",
        ideHint: "IU",
        projectHint: "/work/project",
        ...(username === null ? {} : { u: username }),
        p: String(port),
      });
    },
  );

  it("uses the advertised login username in editor links over a relay", () => {
    const state = resolveRemoteOpenState({
      target: new RelayConnectionTarget({ environmentId, label: "server" }),
      sshTarget: null,
      isDesktopRenderer: false,
      remoteOpenTargets: [
        { kind: "tailscale", host: "server.tail1234.ts.net", username: "admin-user" },
      ],
    });
    expect(state.mode).toBe("remote-links");
    if (state.mode !== "remote-links") throw new Error("Expected a remote link");
    expect(
      buildRemoteOpenUrl({ editor: "cursor", ...state.host, absolutePath: "/work/project" }),
    ).toBe("cursor://vscode-remote/ssh-remote+admin-user%40server.tail1234.ts.net/work/project");
  });

  it("reports unavailable when a remote environment advertises no hosts", () => {
    for (const remoteOpenTargets of [[], undefined] as const) {
      expect(
        resolveRemoteOpenState({
          target: new RelayConnectionTarget({ environmentId, label: "sol" }),
          sshTarget: null,
          isDesktopRenderer: false,
          remoteOpenTargets,
        }),
      ).toEqual({ mode: "remote-unavailable" });
    }
  });
});

describe("buildRemoteOpenUrl", () => {
  it("preserves IPv6 hosts in editor links without an explicit port", () => {
    expect(
      buildRemoteOpenUrl({ editor: "zed", host: "2001:db8::1", absolutePath: "/work/project" }),
    ).toBe("zed://ssh/[2001:db8::1]/work/project");
    for (const editor of ["vscode", "vscode-insiders", "vscodium", "cursor"] as const) {
      const url = new URL(
        buildRemoteOpenUrl({ editor, host: "2001:db8::1", absolutePath: "/work/project" })!,
      );
      expect(url.protocol).toBe(`${editor}:`);
      expect(url.host).toBe("vscode-remote");
      const authority = /^\/ssh-remote\+([^/]+)\/work\/project$/.exec(url.pathname)?.[1];
      expect(authority).toBeDefined();
      expect(JSON.parse(Result.getOrThrow(Hex.decodeString(authority!)))).toEqual({
        hostName: "2001:db8::1",
      });
    }
  });

  it("roots Windows paths", () => {
    expect(
      buildRemoteOpenUrl({ editor: "vscode", host: "sol", absolutePath: "C:\\Users\\theo" }),
    ).toBe("vscode://vscode-remote/ssh-remote+sol/C%3A/Users/theo");
  });

  it("drops the Windows drive letter for Zed", () => {
    expect(
      buildRemoteOpenUrl({ editor: "zed", host: "sol", absolutePath: "C:\\Users\\theo" }),
    ).toBe("zed://ssh/sol/Users/theo");
    expect(buildRemoteOpenUrl({ editor: "zed", host: "sol", absolutePath: "/C:/project" })).toBe(
      "zed://ssh/sol/C%3A/project",
    );
  });

  it.each([
    {
      name: "POSIX path",
      absolutePath: "/tmp/my file.md",
      encodedPath: "/tmp/my%20file.md",
      zedPath: "/tmp/my%20file.md",
      projectHint: "%2Ftmp%2Fmy+file.md",
    },
    {
      name: "POSIX path containing a literal backslash",
      absolutePath: "/tmp/my\\file.md",
      encodedPath: "/tmp/my%5Cfile.md",
      zedPath: "/tmp/my%5Cfile.md",
      projectHint: "%2Ftmp%2Fmy%5Cfile.md",
    },
    {
      name: "Windows drive path",
      absolutePath: "C:\\tmp\\my file.md",
      encodedPath: "/C%3A/tmp/my%20file.md",
      zedPath: "/tmp/my%20file.md",
      projectHint: "C%3A%2Ftmp%2Fmy+file.md",
    },
    {
      name: "Windows UNC path",
      absolutePath: "\\\\server\\share\\my file.md",
      encodedPath: "//server/share/my%20file.md",
      zedPath: "//server/share/my%20file.md",
      projectHint: "%2F%2Fserver%2Fshare%2Fmy+file.md",
    },
  ])(
    "preserves $name and adds positions only for VS Code files",
    ({ absolutePath, encodedPath, zedPath, projectHint }) => {
      const targets = [
        ["vscode", true, `vscode://vscode-remote/ssh-remote+sol${encodedPath}:1:1`],
        ["cursor", true, `cursor://vscode-remote/ssh-remote+sol${encodedPath}:1:1`],
        ["vscode", false, `vscode://vscode-remote/ssh-remote+sol${encodedPath}`],
        ["vscode", undefined, `vscode://vscode-remote/ssh-remote+sol${encodedPath}`],
        ["zed", true, `zed://ssh/sol${zedPath}`],
        ["zed", false, `zed://ssh/sol${zedPath}`],
        [
          "pycharm",
          true,
          `jetbrains://gateway/ssh/environment?h=sol&launchIde=true&ideHint=PY&projectHint=${projectHint}`,
        ],
        [
          "pycharm",
          false,
          `jetbrains://gateway/ssh/environment?h=sol&launchIde=true&ideHint=PY&projectHint=${projectHint}`,
        ],
      ] as const;

      for (const [editor, isFile, expected] of targets) {
        expect(
          buildRemoteOpenUrl({
            editor,
            host: "sol",
            absolutePath,
            ...(isFile === undefined ? {} : { isFile }),
          }),
          `${editor}, isFile=${isFile}`,
        ).toBe(expected);
      }
    },
  );
});
