import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import type { ManagedUpdatesPolicy } from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as TestClock from "effect/testing/TestClock";
import * as TestConsole from "effect/testing/TestConsole";
import { HttpClient, HttpClientResponse } from "effect/http";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import { afterEach, vi } from "vite-plus/test";

import packageJson from "../../package.json" with { type: "json" };
import * as BootService from "../cloud/bootService.ts";
import { pinnedRuntimePaths, prunePinnedRuntimes } from "../cloud/pinnedRuntime.ts";
import * as ManagedPolicy from "../policy/ManagedPolicy.ts";
import * as ProcessRunner from "../processRunner.ts";
import {
  repointLauncher,
  resolveLauncherPath,
  resolveMirrorVersion,
  resolveNewestVersion,
  runUpdate,
} from "./update.ts";

// lsof listing one process, so prune sees a process list in which no runtime is running.
const unrelatedLsof = ProcessRunner.ProcessRunner.of({
  run: () =>
    Effect.succeed({
      stdout: "p1\nftxt\nn/usr/bin/true\n",
      stderr: "",
      code: ChildProcessSpawner.ExitCode(0),
      timedOut: false,
      stdoutTruncated: false,
      stderrTruncated: false,
      stdoutInvalidUtf8: false,
      stderrInvalidUtf8: false,
    }),
});

afterEach(() => vi.restoreAllMocks());

it.effect("authenticates each release page until a published stable release is found", () =>
  Effect.gen(function* () {
    const pages: string[] = [];
    const httpClient = HttpClient.make((request) => {
      const url = new URL(request.url);
      assert.equal(url.origin, "https://api.github.com");
      assert.equal(url.pathname, "/repos/andongmin94/Liverary/releases");
      assert.equal(request.headers.accept, "application/vnd.github+json");
      assert.equal(request.headers.authorization, "Bearer gh-token");
      const page = url.searchParams.get("page") ?? "";
      pages.push(page);
      const release =
        page === "1" ? { tag_name: "v1.2.4", prerelease: true } : { tag_name: "v1.2.3" };
      return Effect.succeed(HttpClientResponse.fromWeb(request, Response.json([release])));
    });
    const version = yield* resolveNewestVersion().pipe(
      Effect.provideService(HostProcess.Environment, { GH_TOKEN: "gh-token" }),
      Effect.provideService(HttpClient.HttpClient, httpClient),
    );
    assert.equal(version, "1.2.3");
    assert.deepStrictEqual(pages, ["1", "2"]);
  }),
);

it.effect("reads the newest version from the update feed file a mirror publishes", () =>
  Effect.gen(function* () {
    const requested: string[] = [];
    const mirror = {
      organization: "Example Corp",
      feedUrl: "https://updates.example.com/t3code/?token=abc",
    };
    const resolve = (platform: NodeJS.Platform, arch: string, feed: string) =>
      resolveMirrorVersion(mirror).pipe(
        Effect.map((version): string => version),
        Effect.catchTags({ CliUpdateError: (error) => Effect.succeed(`error: ${error.reason}`) }),
        Effect.provideService(HostProcess.Platform, platform),
        Effect.provideService(HostProcess.Architecture, arch),
        Effect.provideService(
          HttpClient.HttpClient,
          HttpClient.make((request) => {
            requested.push(request.url);
            return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(feed)));
          }),
        ),
      );

    assert.equal(yield* resolve("darwin", "arm64", "version: 1.4.0\nfiles: []\n"), "1.4.0");
    assert.equal(yield* resolve("linux", "arm64", "version: '1.5.0'\n"), "1.5.0");
    assert.deepStrictEqual(requested, [
      "https://updates.example.com/t3code/latest-mac.yml?token=abc",
      "https://updates.example.com/t3code/latest-linux-arm64.yml?token=abc",
    ]);
    assert.include(
      yield* resolve("win32", "x64", "version: 1.5.0-beta.1\n"),
      "Could not read latest.yml from Example Corp's update mirror.",
    );
  }),
);

it.layer(NodeServices.layer)("t3 update under a managed policy", (it) => {
  const runWithPolicy = (
    updates: ManagedUpdatesPolicy,
    input: { readonly requestedVersion?: string } = {},
    httpClient = HttpClient.make(() => Effect.die("unexpected release lookup")),
  ) =>
    runUpdate({
      baseDir: "/unused",
      logsDir: "/unused",
      serverRuntimeStatePath: "/unused",
      requestedVersion: input.requestedVersion,
      allowDowngrade: false,
      assumeYes: true,
    }).pipe(
      Effect.flip,
      Effect.provide(
        Layer.mergeAll(
          ManagedPolicy.layerTest({
            schemaVersion: 1,
            organization: "Example Corp",
            limits: { updates },
          }),
          // Refusals happen before the update touches the network, the service, or a process.
          Layer.mock(BootService.BootService, {}),
          Layer.mock(ProcessRunner.ProcessRunner, {}),
          Layer.succeed(HttpClient.HttpClient, httpClient),
        ),
      ),
    );

  it.effect("refuses to update when updates are off", () =>
    Effect.gen(function* () {
      const error = yield* runWithPolicy({ mode: "off" });
      assert.equal(error.message, "Example Corp manages Liverary updates.");
    }),
  );

  it.effect("looks for updates on the policy's mirror, never the public releases", () =>
    Effect.gen(function* () {
      const requested: string[] = [];
      const error = yield* runWithPolicy(
        { mode: "auto", feedUrl: "https://updates.example.com/t3code" },
        {},
        HttpClient.make((request) => {
          requested.push(new URL(request.url).origin);
          return Effect.succeed(
            HttpClientResponse.fromWeb(request, new Response("", { status: 404 })),
          );
        }),
      );
      assert.include(error.message, "from Example Corp's update mirror");
      assert.deepStrictEqual(requested, ["https://updates.example.com"]);
    }),
  );
});

it.layer(NodeServices.layer)("t3 update launcher", (it) => {
  it.effect.each(
    (
      [
        { platform: "linux", binEnv: "LIVERARY_INSTALL_BIN_DIR" },
        { platform: "win32", binEnv: "LIVERARY_INSTALL_BIN_DIR" },
        { platform: "win32", binEnv: "T3CODE_INSTALL_BIN_DIR" },
      ] as const
    ).flatMap(({ platform, binEnv }) =>
      [false, true].map((legacyOnly) => ({ platform, binEnv, legacyOnly })),
    ),
  )(
    "retires owned legacy launchers on $platform using $binEnv (legacy only: $legacyOnly)",
    ({ platform, binEnv, legacyOnly }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({ prefix: "t3-update-" });
        const oldExe = path.join(
          root,
          "runtime/versions/1.0.0",
          platform === "win32" ? "t3.exe" : "t3",
        );
        const newExe = path.join(
          root,
          "runtime/versions/2.0.0",
          platform === "win32" ? "liverary.exe" : "liverary",
        );
        const launcher = path.join(root, "bin", platform === "win32" ? "liverary.cmd" : "liverary");
        const legacy = path.join(root, "bin", platform === "win32" ? "t3.cmd" : "t3");
        for (const file of [oldExe, newExe]) {
          yield* fs.makeDirectory(path.dirname(file), { recursive: true });
          yield* fs.writeFileString(file, "");
        }
        yield* fs.makeDirectory(path.dirname(launcher), { recursive: true });
        for (const target of legacyOnly ? [legacy] : [launcher, legacy]) {
          if (platform === "win32")
            yield* fs.writeFileString(target, `@echo off\r\n"${oldExe}" %*`);
          else yield* fs.symlink(oldExe, target);
        }

        if (legacyOnly) {
          yield* fs.writeFileString(launcher, "another program");
          const conflict = yield* repointLauncher({
            launchedAs: platform === "win32" ? yield* fs.realPath(oldExe) : legacy,
            baseDir: root,
            targetEntryPath: newExe,
          }).pipe(
            Effect.provideService(HostProcess.Environment, {
              [binEnv]: path.join(root, "bin"),
              PATH: "",
            }),
            Effect.exit,
          );
          assert.isTrue(Exit.isFailure(conflict));
          assert.equal(yield* fs.readFileString(launcher), "another program");
          assert.isTrue(yield* fs.exists(legacy));
          yield* fs.remove(launcher);
        }

        const wrapperDir = path.join(root, "wrapper");
        const prefixWrapper = `@echo off\r\nset CUSTOM=1\r\n"${oldExe}" %*`;
        if (platform === "win32") {
          yield* fs.makeDirectory(wrapperDir);
          yield* fs.writeFileString(path.join(wrapperDir, "liverary.cmd"), prefixWrapper);
        }
        const repointed = yield* repointLauncher({
          launchedAs:
            platform === "win32" ? yield* fs.realPath(oldExe) : legacyOnly ? legacy : launcher,
          baseDir: root,
          targetEntryPath: newExe,
        }).pipe(
          Effect.provideService(HostProcess.Environment, {
            [binEnv]: platform === "win32" ? wrapperDir : path.join(root, "bin"),
            PATH: platform === "win32" ? path.join(root, "bin") : "",
          }),
        );

        assert.deepStrictEqual(Option.getOrUndefined(repointed), launcher);
        if (platform === "win32") assert.include(yield* fs.readFileString(launcher), `"${newExe}"`);
        else assert.equal(yield* fs.readLink(launcher), newExe);
        assert.isFalse(yield* fs.exists(legacy));
        if (platform === "win32") {
          assert.equal(
            yield* fs.readFileString(path.join(wrapperDir, "liverary.cmd")),
            prefixWrapper,
          );
        }
        const foreign = path.join(root, "another-install", "t3");
        if (platform === "win32") yield* fs.writeFileString(legacy, `@echo off\r\n"${foreign}" %*`);
        else yield* fs.symlink(foreign, legacy);
        yield* repointLauncher({
          launchedAs: platform === "win32" ? newExe : launcher,
          baseDir: root,
          targetEntryPath: oldExe,
        }).pipe(
          Effect.provideService(HostProcess.Environment, {
            [binEnv]: path.join(root, "bin"),
            PATH: "",
          }),
        );
        if (platform === "win32") assert.include(yield* fs.readFileString(legacy), `"${foreign}"`);
        else assert.equal(yield* fs.readLink(legacy), foreign);

        if (platform === "win32") {
          const wrapper = `@echo off\r\nset CUSTOM=1\r\n"${oldExe}" %*`;
          yield* fs.writeFileString(legacy, wrapper);
          yield* repointLauncher({
            launchedAs: oldExe,
            baseDir: root,
            targetEntryPath: newExe,
          }).pipe(
            Effect.provideService(HostProcess.Environment, {
              [binEnv]: path.join(root, "bin"),
              PATH: "",
            }),
          );
          assert.equal(yield* fs.readFileString(legacy), wrapper);
        }
      }).pipe(Effect.scoped, Effect.provideService(HostProcess.Platform, platform)),
  );

  it.effect.each(["linux", "win32"] as const)(
    "repoints a launcher through the migrated home alias on %s",
    (platform) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({ prefix: "liverary-update-home-" });
        const legacyHome = path.join(root, ".t3-custom");
        const baseDir = path.join(root, ".liverary");
        const oldExe = path.join(
          legacyHome,
          "runtime/versions/1.0.0",
          platform === "win32" ? "t3.exe" : "t3",
        );
        const newExe = path.join(
          baseDir,
          "runtime/versions/2.0.0",
          platform === "win32" ? "liverary.exe" : "liverary",
        );
        const launcher = path.join(root, "bin", platform === "win32" ? "liverary.cmd" : "liverary");
        yield* fs.makeDirectory(path.dirname(oldExe), { recursive: true });
        yield* fs.writeFileString(oldExe, "");
        yield* fs.makeDirectory(path.dirname(launcher), { recursive: true });
        if (platform === "win32")
          yield* fs.writeFileString(launcher, `@echo off\r\n"${oldExe}" %*`);
        else yield* fs.symlink(oldExe, launcher);
        yield* fs.rename(legacyHome, baseDir);
        yield* fs.symlink(baseDir, legacyHome);
        yield* fs.makeDirectory(path.dirname(newExe), { recursive: true });
        yield* fs.writeFileString(newExe, "");

        const repointed = yield* repointLauncher({
          launchedAs: platform === "win32" ? yield* fs.realPath(oldExe) : launcher,
          baseDir,
          targetEntryPath: newExe,
        }).pipe(
          Effect.provideService(HostProcess.Environment, {
            T3CODE_INSTALL_BIN_DIR: path.dirname(launcher),
            PATH: "",
          }),
        );

        assert.equal(Option.getOrUndefined(repointed), launcher);
        if (platform === "win32") assert.include(yield* fs.readFileString(launcher), `"${newExe}"`);
        else assert.equal(yield* fs.readLink(launcher), newExe);
      }).pipe(Effect.scoped, Effect.provideService(HostProcess.Platform, platform)),
  );

  it.effect.each([
    { name: "no launcher records", recorded: undefined },
    { name: "an empty launcher record", recorded: "" },
    { name: "whole launcher records", recorded: "/opt/t3\n" },
    { name: "Windows launcher records", recorded: "C:\\t3.cmd\r\n" },
    // An interrupted append cut this record short.
    { name: "an unterminated launcher record", recorded: "/opt/t" },
    // Another process's append is cut short after t3 update reads the records.
    { name: "a record cut short after the read", recorded: "/opt/t3\n", cut: "/opt/t" },
  ])("keeps the runtime a repointed launcher off PATH points at with $name", ({ recorded, cut }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped({ prefix: "t3-update-" });
      yield* TestClock.setTime(Duration.toMillis(Duration.days(1)));
      for (const version of ["1.0.0", "2.0.0"]) {
        const directory = path.join(root, "runtime/versions", version);
        yield* fs.makeDirectory(directory, { recursive: true });
        yield* fs.writeFileString(path.join(directory, "t3"), "");
        yield* fs.writeFileString(path.join(directory, ".install-complete"), `${version}\n`);
        yield* fs.utimes(path.join(directory, ".install-complete"), 0, 0);
      }
      if (recorded !== undefined) {
        yield* fs.writeFileString(path.join(root, "runtime/launchers"), recorded);
      }
      // A launcher in the T3 home itself, which neither PATH nor the default bin dir reaches.
      const launcher = path.join(root, "liverary");
      yield* fs.symlink(path.join(root, "runtime/versions/1.0.0/t3"), launcher);

      const launchersFile = path.join(root, "runtime/launchers");
      yield* repointLauncher({
        launchedAs: launcher,
        baseDir: root,
        targetEntryPath: path.join(root, "runtime/versions/2.0.0/t3"),
      }).pipe(
        Effect.provideService(FileSystem.FileSystem, {
          ...fs,
          readFileString: (file, encoding) =>
            fs
              .readFileString(file, encoding)
              .pipe(
                Effect.tap(() =>
                  cut === undefined || file !== launchersFile
                    ? Effect.void
                    : fs.writeFileString(file, cut, { flag: "a" }),
                ),
              ),
        }),
      );
      // A later server start prunes with no idea how this machine launches t3.
      const removed = yield* prunePinnedRuntimes({ baseDir: root, keep: [] }).pipe(
        Effect.provideService(ProcessRunner.ProcessRunner, unrelatedLsof),
        Effect.provideService(HostProcess.Platform, "darwin"),
        Effect.provideService(HostProcess.Environment, { PATH: "" }),
        Effect.provideService(HostProcess.HomeDirectory, root),
      );

      assert.deepStrictEqual(removed, ["1.0.0"]);
      // macOS temp dirs sit behind the /var -> /private/var symlink, so compare canonical paths.
      assert.equal(
        yield* fs.realPath(launcher),
        yield* fs.realPath(path.join(root, "runtime/versions/2.0.0/t3")),
      );
    }).pipe(Effect.scoped, Effect.provideService(HostProcess.Platform, "linux")),
  );

  const launcherFixture = Effect.fnUntraced(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fs.makeTempDirectoryScoped({ prefix: "t3-update-" });
    const oldExe = path.join(root, "runtime/versions/1.0.0/t3");
    const newExe = path.join(root, "runtime/versions/2.0.0/t3");
    const launcher = path.join(root, "liverary");
    for (const file of [oldExe, newExe]) {
      yield* fs.makeDirectory(path.dirname(file), { recursive: true });
      yield* fs.writeFileString(file, "");
    }
    yield* fs.symlink(oldExe, launcher);
    return { root, oldExe, newExe, launcher, launchersFile: path.join(root, "runtime/launchers") };
  });

  it.effect("records a relative launcher path as absolute", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const { root, newExe, launcher, launchersFile } = yield* launcherFixture();

      yield* repointLauncher({
        launchedAs: path.relative(path.resolve("."), launcher),
        baseDir: root,
        targetEntryPath: newExe,
      });

      assert.equal(yield* fs.readFileString(launchersFile), `\n${launcher}\n`);
    }).pipe(Effect.scoped, Effect.provideService(HostProcess.Platform, "linux")),
  );

  it.effect("fails instead of repointing a launcher it cannot record", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { root, oldExe, newExe, launcher, launchersFile } = yield* launcherFixture();
      // Appending to a directory fails the way a read-only or full disk would.
      yield* fs.makeDirectory(launchersFile);

      const result = yield* repointLauncher({
        launchedAs: launcher,
        baseDir: root,
        targetEntryPath: newExe,
      }).pipe(Effect.exit);

      assert.isTrue(Exit.isFailure(result));
      assert.equal(yield* fs.readLink(launcher), oldExe);
    }).pipe(Effect.scoped, Effect.provideService(HostProcess.Platform, "linux")),
  );

  it.effect.each(["recording", "repointing"] as const)(
    "never leaves a repointed launcher unrecorded when t3 update dies while %s",
    (step) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const { root, newExe, launcher, launchersFile } = yield* launcherFixture();

        yield* repointLauncher({
          launchedAs: launcher,
          baseDir: root,
          targetEntryPath: newExe,
        }).pipe(
          Effect.provideService(FileSystem.FileSystem, {
            ...fs,
            writeFileString: (path, data, options) =>
              step === "recording" && path === launchersFile
                ? Effect.die("t3 update was killed")
                : fs.writeFileString(path, data, options),
            rename: (from, to) =>
              step === "repointing" && to === launcher
                ? Effect.die("t3 update was killed")
                : fs.rename(from, to),
          }),
          Effect.exit,
        );

        const repointed = (yield* fs.readLink(launcher)) === newExe;
        const recorded = (yield* fs
          .readFileString(launchersFile)
          .pipe(Effect.orElseSucceed(() => "")))
          .split("\n")
          .includes(launcher);
        assert.isFalse(repointed && !recorded);
      }).pipe(Effect.scoped, Effect.provideService(HostProcess.Platform, "linux")),
  );

  it.effect("leaves a plain copy or a foreign symlink alone", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped({ prefix: "t3-update-" });
      const newExe = path.join(root, "runtime/versions/2.0.0/t3");
      const copy = path.join(root, "copy/t3");
      const foreign = path.join(root, "foreign/t3");
      const elsewhere = path.join(root, "elsewhere/t3");
      const otherHome = path.join(root, "other/runtime/versions/1.0.0/t3");
      const otherLauncher = path.join(root, "other/bin/t3");
      for (const file of [newExe, copy, elsewhere, otherHome]) {
        yield* fs.makeDirectory(path.dirname(file), { recursive: true });
        yield* fs.writeFileString(file, "");
      }
      yield* fs.makeDirectory(path.dirname(foreign), { recursive: true });
      yield* fs.symlink(elsewhere, foreign);
      yield* fs.makeDirectory(path.dirname(otherLauncher), { recursive: true });
      yield* fs.symlink(otherHome, otherLauncher);

      for (const launchedAs of [copy, foreign, otherLauncher, undefined]) {
        const repointed = yield* repointLauncher({
          launchedAs,
          baseDir: root,
          targetEntryPath: newExe,
        });
        assert.equal(repointed._tag, "None", launchedAs ?? "undefined");
      }
      assert.equal(yield* fs.readLink(foreign), elsewhere);
      assert.equal(yield* fs.readLink(otherLauncher), otherHome);
    }).pipe(Effect.scoped, Effect.provideService(HostProcess.Platform, "linux")),
  );

  it.effect("finds the launcher a bare command name resolved to on PATH", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const delimiter = (yield* HostProcess.Platform) === "win32" ? ";" : ":";
      const root = yield* fs.makeTempDirectoryScoped({ prefix: "t3-update-" });
      const launcher = path.join(root, "bin/t3");
      yield* fs.makeDirectory(path.dirname(launcher), { recursive: true });
      yield* fs.writeFileString(launcher, "");

      const bare = yield* resolveLauncherPath.pipe(
        Effect.provideService(HostProcess.InvokedAs, "t3"),
        Effect.provideService(HostProcess.Environment, {
          PATH: [path.join(root, "missing"), path.join(root, "bin")].join(delimiter),
        }),
        Effect.provideService(HostProcess.WorkingDirectory, root),
      );
      const relative = yield* resolveLauncherPath.pipe(
        Effect.provideService(HostProcess.InvokedAs, "./bin/t3"),
        Effect.provideService(HostProcess.Environment, { PATH: "" }),
        Effect.provideService(HostProcess.WorkingDirectory, root),
      );
      const absent = yield* resolveLauncherPath.pipe(
        Effect.provideService(HostProcess.InvokedAs, "t3"),
        Effect.provideService(HostProcess.Environment, { PATH: path.join(root, "missing") }),
        Effect.provideService(HostProcess.WorkingDirectory, root),
      );

      assert.equal(bare, launcher);
      assert.equal(relative, launcher);
      assert.equal(absent, undefined);
    }).pipe(Effect.scoped),
  );
});

// Without terminals, update skips its restart prompt whatever runs the test.
const withoutTerminals = Effect.acquireRelease(
  Effect.sync(() =>
    [process.stdin, process.stdout].map((stream) => {
      const descriptor = Object.getOwnPropertyDescriptor(stream, "isTTY");
      Object.defineProperty(stream, "isTTY", { configurable: true, value: false });
      return { stream, descriptor };
    }),
  ),
  (saved) =>
    Effect.sync(() => {
      for (const { stream, descriptor } of saved) {
        if (descriptor === undefined) Reflect.deleteProperty(stream, "isTTY");
        else Object.defineProperty(stream, "isTTY", descriptor);
      }
    }),
);

it.layer(NodeServices.layer)("t3 update with a background service", (it) => {
  it.effect.each(["direct", "alias"] as const)(
    "names the version a service with a pending restart still runs through a %s home",
    (homeKind) =>
      Effect.gen(function* () {
        yield* withoutTerminals;
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({ prefix: "t3-update-" });
        const baseDir = path.join(root, ".liverary");
        const installedBaseDir = homeKind === "alias" ? path.join(root, ".t3-custom") : baseDir;
        const version = packageJson.version;
        const runtime = pinnedRuntimePaths(path, baseDir, version, "linux");
        yield* fs.makeDirectory(runtime.versionDir, { recursive: true });
        yield* fs.writeFileString(runtime.entryPath, "");
        yield* fs.writeFileString(runtime.sentinelPath, `${version}\n`);
        if (homeKind === "alias") yield* fs.symlink(baseDir, installedBaseDir);
        const unitPath = path.join(baseDir, "t3code.service");
        const logPath = path.join(baseDir, "boot-service.log");
        // An earlier `t3 update` pointed the service at this version without restarting it.
        const service = Layer.mock(BootService.BootService, {
          status: Effect.succeed<BootService.BootServiceStatus>({
            supported: true,
            installed: true,
            current: false,
            installedVersion: version,
            installedBaseDir,
            problems: ["restart-pending"],
            unitPath,
            logPath,
          }),
          install: () =>
            Effect.succeed({ program: [runtime.entryPath], baseDir, unitPath, logPath }),
        });
        vi.spyOn(BootService, "layer").mockReturnValue(service);
        const runner = ProcessRunner.ProcessRunner.of({
          run: (input) =>
            input.args?.includes("--version") === true
              ? unrelatedLsof
                  .run(input)
                  .pipe(Effect.map((result) => ({ ...result, stdout: `t3 v${version}\n` })))
              : unrelatedLsof.run(input),
        });

        const output = yield* runUpdate({
          baseDir,
          logsDir: baseDir,
          serverRuntimeStatePath: path.join(baseDir, "server-runtime.json"),
          requestedVersion: version,
          allowDowngrade: false,
          assumeYes: false,
        }).pipe(
          Effect.andThen(TestConsole.logLines),
          Effect.map((lines) => lines.join("\n")),
          Effect.provide(
            Layer.mergeAll(
              service,
              Layer.succeed(ProcessRunner.ProcessRunner, runner),
              ManagedPolicy.layerTest(),
              Layer.succeed(
                HttpClient.HttpClient,
                HttpClient.make(() => Effect.die("unexpected release lookup")),
              ),
              Layer.fresh(TestConsole.layer),
            ),
          ),
        );

        assert.include(
          output,
          `Background service still running the version before ${version}. Run \`liverary service restart\` when you are ready to switch it to ${version}.`,
        );
      }).pipe(
        Effect.scoped,
        Effect.provideService(HostProcess.Platform, "linux"),
        Effect.provideService(HostProcess.Environment, { PATH: "" }),
      ),
  );
});
