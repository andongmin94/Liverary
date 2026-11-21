import { Atom, AsyncResult } from "effect/reactivity";
import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import type { AtomCommandResult } from "@t3tools/client-runtime/state/runtime";
import { SshConnectionProfile, SshConnectionTarget } from "@t3tools/client-runtime/connection";
import { EnvironmentId, type DesktopDiscoveredSshHost } from "@t3tools/contracts";
import { useState } from "react";
import { page, userEvent } from "vite-plus/test/browser";
import { describe, expect, it, vi } from "vite-plus/test";

import { render, stubGlobal } from "../../../test/render";
import { AppAtomRegistryProvider } from "../../rpc/atomRegistry";
import type { EnvironmentPresentation } from "~/state/environments";

const mocks = vi.hoisted(() => ({
  connectSshEnvironment: vi.fn<() => Promise<AtomCommandResult<void, Error>>>(async () =>
    AsyncResult.success(undefined),
  ),
  refresh: () => {},
  hosts: [] as ReadonlyArray<DesktopDiscoveredSshHost>,
  resolveSshHost: vi.fn(async (alias: string) => ({
    alias,
    hostname: "bastion.example.com",
    username: "maria",
    port: 2200,
  })),
}));

vi.mock(import("../../state/use-atom-command"), async (original) => ({
  ...(await original()),
  useAtomCommand: ((command: unknown) => command) as never,
}));
vi.mock(import("~/connection/onboarding"), async (original) => ({
  ...(await original()),
  connectSshEnvironment: mocks.connectSshEnvironment as never,
}));
vi.mock(import("~/state/query"), async (original) => ({
  ...(await original()),
  useEnvironmentQuery: (() => ({
    data: mocks.hosts,
    isPending: false,
    error: null,
    refresh: mocks.refresh,
  })) as never,
}));
vi.mock(import("~/state/server"), async (original) => ({
  ...(await original()),
  primaryServerKeybindingsAtom: Atom.make([]) as never,
}));

import { AddEnvironmentDialog } from "./AddEnvironmentDialog";

function Owner({
  savedEnvironments = [],
}: {
  readonly savedEnvironments?: ReadonlyArray<EnvironmentPresentation>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AppAtomRegistryProvider>
      <AddEnvironmentDialog
        open={open}
        routeTarget={null}
        error={error}
        savedEnvironments={savedEnvironments}
        onOpenChange={setOpen}
        onErrorChange={setError}
      />
    </AppAtomRegistryProvider>
  );
}

function setup(hosts: ReadonlyArray<DesktopDiscoveredSshHost> = []) {
  mocks.connectSshEnvironment.mockClear();
  mocks.resolveSshHost.mockClear();
  mocks.hosts = hosts;
  return stubGlobal("desktopBridge", { resolveSshHost: mocks.resolveSshHost });
}

const remoteCard = () => page.getByRole("button", { name: /원격 링크/ });
const sshCard = () => page.getByRole("button", { name: /^SSH/ });

async function openDialogOnSsh() {
  await userEvent.click(page.getByRole("button", { name: "환경 추가" }));
  await userEvent.click(sshCard());
  await expect.element(sshCard()).toHaveAttribute("aria-pressed", "true");
}

async function expectDefaultModeAfterReopen() {
  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  await userEvent.click(page.getByRole("button", { name: "환경 추가" }));
  await expect.element(remoteCard()).toHaveAttribute("aria-pressed", "true");
  await expect.element(sshCard()).toHaveAttribute("aria-pressed", "false");
  await expect.element(page.getByPlaceholder("backend.example.com")).toBeInTheDocument();
}

describe("AddEnvironmentDialog", () => {
  it.each([
    {
      name: "the configured SSH port",
      selected: /devbox/,
      alias: "devbox",
      port: 2200,
      savedPort: null,
    },
    {
      name: "the selected port among two known endpoints",
      selected: /bastion\.example\.com:2223/,
      alias: "bastion.example.com",
      port: 2223,
      savedPort: null,
    },
    {
      name: "another known port on an already saved host",
      selected: /bastion\.example\.com:2223/,
      alias: "bastion.example.com",
      port: 2223,
      savedPort: 2222,
    },
    {
      name: "an IPv6 endpoint distinct from an address ending with the port digits",
      selected: /2001:db8::1\s*2001:db8::1:2222/,
      alias: "2001:db8::1",
      port: 2222,
      savedPort: null,
    },
  ])("connects a suggestion using $name", async ({ selected, alias, port, savedPort }) => {
    using _bridge = setup([
      {
        alias: "2001:db8::1:2222",
        hostname: "2001:db8::1:2222",
        username: null,
        port: null,
        source: "known-hosts",
      },
      {
        alias: "2001:db8::1",
        hostname: "2001:db8::1",
        username: null,
        port: 2222,
        source: "known-hosts",
      },
      {
        alias: "devbox",
        hostname: "bastion.example.com",
        username: null,
        port: null,
        source: "ssh-config",
      },
      ...[2222, 2223].map((port): DesktopDiscoveredSshHost => ({
        alias: "bastion.example.com",
        hostname: "bastion.example.com",
        username: null,
        port,
        source: "known-hosts",
      })),
    ]);
    const environmentId = EnvironmentId.make("saved-bastion");
    const connection = { environmentId, connectionId: "ssh-bastion", label: "Bastion" };
    const savedEnvironments: ReadonlyArray<EnvironmentPresentation> =
      savedPort === null
        ? []
        : [
            {
              environmentId,
              label: "Bastion",
              displayUrl: null,
              entry: {
                target: new SshConnectionTarget(connection),
                profile: Option.some(
                  new SshConnectionProfile({
                    ...connection,
                    target: {
                      alias: "bastion.example.com",
                      hostname: "bastion.example.com",
                      username: "maria",
                      port: savedPort,
                    },
                  }),
                ),
                enabled: true,
              },
              connection: { phase: "connected", error: null, traceId: null },
              serverConfig: null,
            },
          ];
    await using _screen = await render(<Owner savedEnvironments={savedEnvironments} />);

    await openDialogOnSsh();
    await userEvent.click(page.getByPlaceholder("호스트 검색 또는 devbox 입력"));
    if (savedPort !== null) {
      await expect
        .element(page.getByRole("option", { name: /bastion\.example\.com:2222/ }))
        .not.toBeInTheDocument();
    }
    await userEvent.click(page.getByRole("option", { name: selected }));
    await vi.waitFor(() => {
      expect(mocks.connectSshEnvironment).toHaveBeenCalledExactlyOnceWith({
        label: "",
        target: { alias, hostname: "bastion.example.com", username: "maria", port },
      });
    });
  });

  it("reopens on Remote link after adding an SSH environment", async () => {
    using _bridge = setup();
    await using _screen = await render(<Owner />);

    await openDialogOnSsh();
    await userEvent.fill(page.getByPlaceholder("호스트 검색 또는 devbox 입력"), "devbox");
    await userEvent.click(page.getByRole("dialog").getByRole("button", { name: "환경 추가" }));
    expect(mocks.connectSshEnvironment).toHaveBeenCalledOnce();

    await expectDefaultModeAfterReopen();
  });

  it("drops an SSH error when switching to Remote link", async () => {
    using _bridge = setup();
    await using _screen = await render(<Owner />);

    mocks.connectSshEnvironment.mockResolvedValueOnce(
      AsyncResult.failure(Cause.fail(new Error("ssh: connection refused"))),
    );
    await openDialogOnSsh();
    await userEvent.fill(page.getByPlaceholder("호스트 검색 또는 devbox 입력"), "devbox");
    await userEvent.click(page.getByRole("dialog").getByRole("button", { name: "환경 추가" }));
    await expect.element(page.getByText(/connection refused/)).toBeInTheDocument();

    await userEvent.click(remoteCard());
    await expect.element(page.getByText(/connection refused/)).not.toBeInTheDocument();
  });

  it("clears the form after dismissing it on SSH", async () => {
    using _bridge = setup();
    await using _screen = await render(<Owner />);

    await openDialogOnSsh();
    await userEvent.click(remoteCard());
    await userEvent.fill(page.getByPlaceholder("backend.example.com"), "devbox.example.com");
    await userEvent.fill(page.getByPlaceholder("PAIRCODE"), "PAIRCODE");
    await userEvent.click(sshCard());
    await userEvent.fill(page.getByPlaceholder("호스트 검색 또는 devbox 입력"), "devbox");
    await userEvent.fill(page.getByPlaceholder("root"), "maria");
    await userEvent.fill(page.getByPlaceholder("22"), "2222");
    await userEvent.keyboard("{Escape}");

    await expectDefaultModeAfterReopen();
    await expect.element(page.getByPlaceholder("backend.example.com")).toHaveValue("");
    await expect.element(page.getByPlaceholder("PAIRCODE")).toHaveValue("");
    await userEvent.click(sshCard());
    await expect.element(page.getByPlaceholder("호스트 검색 또는 devbox 입력")).toHaveValue("");
    await expect.element(page.getByPlaceholder("root")).toHaveValue("");
    await expect.element(page.getByPlaceholder("22")).toHaveValue("");

    let finishConnection!: (result: AtomCommandResult<void, Error>) => void;
    const pending = new Promise<AtomCommandResult<void, Error>>((resolve) => {
      finishConnection = resolve;
    });
    mocks.connectSshEnvironment.mockImplementationOnce(() => pending);
    await userEvent.fill(page.getByPlaceholder("호스트 검색 또는 devbox 입력"), "devbox");
    await userEvent.click(page.getByRole("dialog").getByRole("button", { name: "환경 추가" }));
    await userEvent.keyboard("{Escape}");
    await expectDefaultModeAfterReopen();
    finishConnection(AsyncResult.failure(Cause.fail(new Error("dismissed SSH attempt"))));
    await expect
      .element(page.getByRole("dialog").getByRole("button", { name: "환경 추가" }))
      .toBeEnabled();
    await expect.element(page.getByText(/dismissed SSH attempt/)).not.toBeInTheDocument();
  });
});
