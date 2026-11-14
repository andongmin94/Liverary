import * as HostProcess from "@t3tools/shared/HostProcess";
import {
  CLI_RELEASE_BASE_URL_ENV,
  cliReleaseIndexPageUrl,
  newestCliReleaseVersion,
  releaseAssetUrl,
  updateFeedFileName,
} from "@t3tools/shared/cliRelease";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { Argument, Command, Flag, GlobalFlag, Prompt } from "effect/cli";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import packageJson from "../../package.json" with { type: "json" };
import * as BootService from "../cloud/bootService.ts";
import {
  ensurePinnedRuntimeInstalled,
  generatedWindowsShimTarget,
  launcherOwnsVersionsDir,
  pinnedRuntimeCommand,
  isUnpublishedRelease,
  PinnedRuntimeInstallError,
  pinnedRuntimePaths,
  pinnedRuntimeVersionsDir,
  prunePinnedRuntimes,
  recordPinnedRuntimeLauncher,
} from "../cloud/pinnedRuntime.ts";
import { compareExactServiceVersions, isExactServiceVersion } from "../cloud/serviceProtocol.ts";
import * as ManagedPolicy from "../policy/ManagedPolicy.ts";
import { managedUpdateMirror, managedUpdateRefusal } from "../policy/managedUpdates.ts";
import * as ProcessRunner from "../processRunner.ts";
import { isProcessAlive, readPersistedServerRuntimeState } from "../serverRuntimeState.ts";
import { projectLocationFlags, resolveCliAuthConfig } from "./config.ts";
import { createUpdateProgress } from "./updateProgress.ts";
import * as CliService from "./service.ts";

export class CliUpdateError extends Schema.TaggedError<CliUpdateError>()("CliUpdateError", {
  reason: Schema.String,
}) {
  override get message(): string {
    return this.reason;
  }
}

export const launcherAliasPaths = (path: Path.Path, launcher: string): ReadonlyArray<string> => {
  const match = /^(?:liverary|t3)(\.cmd)?$/.exec(path.basename(launcher));
  return match
    ? [
        ...new Set([
          launcher,
          ...["liverary", "t3"].map((name) =>
            path.join(path.dirname(launcher), `${name}${match[1] ?? ""}`),
          ),
        ]),
      ]
    : [launcher];
};

const ReleaseIndex = Schema.Array(
  Schema.Struct({
    tag_name: Schema.String,
    draft: Schema.optional(Schema.Boolean),
    prerelease: Schema.optional(Schema.Boolean),
  }),
);
const decodeReleaseIndex = Schema.decodeUnknownEffect(Schema.fromJsonString(ReleaseIndex));

const RELEASE_INDEX_TIMEOUT = Duration.seconds(30);
const RELEASE_INDEX_MAX_PAGES = 10;

export const resolveNewestVersion = Effect.fn("cli.update.resolve_newest")(function* () {
  const httpClient = yield* HttpClient.HttpClient;
  const environment = yield* HostProcess.Environment;
  const githubToken = environment.GH_TOKEN?.trim() || environment.GITHUB_TOKEN?.trim() || undefined;
  for (let page = 1; page <= RELEASE_INDEX_MAX_PAGES; page += 1) {
    const request = HttpClientRequest.get(cliReleaseIndexPageUrl(page)).pipe(
      HttpClientRequest.setHeader("Accept", "application/vnd.github+json"),
    );
    const authenticatedRequest =
      githubToken === undefined
        ? request
        : HttpClientRequest.setHeader(request, "Authorization", `Bearer ${githubToken}`);
    const body = yield* httpClient.execute(authenticatedRequest).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap((response) => response.text),
      Effect.mapError(
        () => new CliUpdateError({ reason: "Could not list Liverary CLI releases." }),
      ),
      Effect.timeoutOrElse({
        duration: RELEASE_INDEX_TIMEOUT,
        orElse: () =>
          Effect.fail(new CliUpdateError({ reason: "Timed out listing Liverary CLI releases." })),
      }),
    );
    const releases = yield* decodeReleaseIndex(body).pipe(
      Effect.mapError(
        () =>
          new CliUpdateError({ reason: "The Liverary CLI release index had an unexpected shape." }),
      ),
    );
    const version = newestCliReleaseVersion(releases);
    if (version !== undefined) return version;
    if (releases.length === 0) break;
  }
  return yield* new CliUpdateError({ reason: "No published stable release was found." });
});

/** The version an update mirror's feed file for this platform offers. */
export const resolveMirrorVersion = Effect.fn("cli.update.resolve_mirror")(function* (mirror: {
  readonly organization: string;
  readonly feedUrl: string;
}) {
  const httpClient = yield* HttpClient.HttpClient;
  const fileName = updateFeedFileName(yield* HostProcess.Platform, yield* HostProcess.Architecture);
  const url = releaseAssetUrl(mirror.feedUrl, fileName);
  // Not the URL, whose query can hold the mirror's access token.
  const unreadable = new CliUpdateError({
    reason: `Could not read ${fileName} from ${mirror.organization}'s update mirror.`,
  });
  const body = yield* httpClient.get(url).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) => response.text),
    Effect.mapError(() => unreadable),
    Effect.timeoutOrElse({
      duration: RELEASE_INDEX_TIMEOUT,
      orElse: () => Effect.fail(unreadable),
    }),
  );
  const version = /^version:\s*["']?([^"'\s]+)/m.exec(body)?.[1];
  if (version === undefined || !isExactServiceVersion(version)) {
    return yield* unreadable;
  }
  return version;
});

/**
 * Record the canonical launcher before switching it so pruning keeps its runtime. Retire an
 * owned legacy alias only after the canonical command is installed.
 */
export const repointLauncher = Effect.fn("cli.update.repoint_launcher")(function* (input: {
  readonly launchedAs: string | undefined;
  readonly baseDir: string;
  readonly targetEntryPath: string;
}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const platform = yield* HostProcess.Platform;
  if (input.launchedAs === undefined) return Option.none<string>();
  const versionsDir = yield* fs
    .realPath(pinnedRuntimeVersionsDir(path, input.baseDir))
    .pipe(Effect.option);
  if (Option.isNone(versionsDir)) return Option.none<string>();
  const ownsTarget = (candidate: string) =>
    fs.realPath(candidate).pipe(
      Effect.map((target) => launcherOwnsVersionsDir(path, versionsDir.value, target)),
      Effect.orElseSucceed(() => false),
    );
  const remember = (launcher: string) =>
    recordPinnedRuntimeLauncher({ baseDir: input.baseDir, launcher }).pipe(
      Effect.mapError(
        () =>
          new CliUpdateError({
            reason: `Could not record the Liverary CLI launcher at ${launcher}.`,
          }),
      ),
    );

  const origin = platform === "win32" ? yield* findWindowsShim(input.launchedAs) : input.launchedAs;
  if (origin === undefined) return Option.none<string>();
  const targetOf = (launcher: string) =>
    platform === "win32"
      ? fs.readFileString(launcher).pipe(
          Effect.map(generatedWindowsShimTarget),
          Effect.orElseSucceed(() => undefined),
        )
      : fs.readLink(launcher).pipe(
          Effect.map((target) => path.resolve(path.dirname(launcher), target)),
          Effect.orElseSucceed(() => undefined),
        );
  const originTarget = yield* targetOf(origin);
  if (originTarget === undefined || !(yield* ownsTarget(originTarget)))
    return Option.none<string>();
  const name = /^(?:liverary|t3)(\.cmd)?$/.exec(path.basename(origin));
  const launcher = name ? path.join(path.dirname(origin), `liverary${name[1] ?? ""}`) : origin;
  const target = yield* targetOf(launcher);
  const exists = target !== undefined || (yield* fs.exists(launcher));
  if (exists && (target === undefined || !(yield* ownsTarget(target)))) {
    return yield* new CliUpdateError({
      reason: `Another program is already at ${launcher}. The existing CLI launcher was left unchanged.`,
    });
  }
  yield* remember(launcher);
  const rewrite =
    platform === "win32"
      ? fs.writeFileString(launcher, `@echo off\r\n"${input.targetEntryPath}" %*`, {
          flag: exists ? "w" : "wx",
        })
      : exists
        ? fs
            .symlink(input.targetEntryPath, `${launcher}.${process.pid}.tmp`)
            .pipe(Effect.andThen(fs.rename(`${launcher}.${process.pid}.tmp`, launcher)))
        : fs.symlink(input.targetEntryPath, launcher);
  yield* rewrite.pipe(
    Effect.mapError(
      () =>
        new CliUpdateError({
          reason: `Could not repoint the Liverary CLI launcher at ${launcher}.`,
        }),
    ),
  );
  for (const legacy of launcherAliasPaths(path, origin)) {
    if (!/^t3(?:\.cmd)?$/.test(path.basename(legacy))) continue;
    const legacyTarget = yield* targetOf(legacy);
    if (legacyTarget === undefined || !(yield* ownsTarget(legacyTarget))) continue;
    yield* fs.remove(legacy).pipe(
      Effect.mapError(
        () =>
          new CliUpdateError({
            reason: `Could not remove the old Liverary CLI alias at ${legacy}.`,
          }),
      ),
    );
  }
  return Option.some(launcher);
});

/** Node preserves argv0's spelling; resolve bare names on PATH to find the launcher symlink. */
export const resolveLauncherPath = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const invokedAs = yield* HostProcess.InvokedAs;
  const cwd = yield* HostProcess.WorkingDirectory;
  const environment = yield* HostProcess.Environment;
  const platform = yield* HostProcess.Platform;
  if (invokedAs.includes("/") || invokedAs.includes("\\")) {
    return path.resolve(cwd, invokedAs);
  }
  const delimiter = platform === "win32" ? ";" : ":";
  for (const directory of (environment["PATH"] ?? "").split(delimiter)) {
    if (directory.length === 0) continue;
    const candidate = path.join(directory, invokedAs);
    if (yield* fs.exists(candidate).pipe(Effect.orElseSucceed(() => false))) {
      return candidate;
    }
  }
  return undefined;
});

/** Windows executables see their own path, so match the installer shim's real target. */
export const findWindowsShim = Effect.fn("cli.update.find_windows_shim")(function* (
  executablePath: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const environment = yield* HostProcess.Environment;
  const executable = yield* fs.realPath(executablePath).pipe(Effect.option);
  if (Option.isNone(executable)) return undefined;
  const installBinDir =
    environment["LIVERARY_INSTALL_BIN_DIR"] || environment["T3CODE_INSTALL_BIN_DIR"];
  const candidates = [
    ...(installBinDir ? [installBinDir] : []),
    ...(environment["PATH"] ?? environment["Path"] ?? "").split(";"),
  ].filter((entry) => entry.trim().length > 0);
  for (const directory of candidates) {
    for (const name of ["liverary.cmd", "t3.cmd"]) {
      const shimPath = path.join(directory, name);
      const contents = yield* fs.readFileString(shimPath).pipe(Effect.option);
      if (Option.isNone(contents)) continue;
      const target = generatedWindowsShimTarget(contents.value);
      if (target === undefined) continue;
      const targetPath = yield* fs.realPath(target).pipe(Effect.option);
      if (
        Option.isSome(targetPath) &&
        targetPath.value.toLowerCase() === executable.value.toLowerCase()
      ) {
        return shimPath;
      }
    }
  }
  return undefined;
});

const updateFlags = {
  ...projectLocationFlags,
  allowDowngrade: Flag.Boolean("allow-downgrade").pipe(
    Flag.withDescription("Allow moving to an older version than the one running."),
    Flag.withDefault(false),
  ),
  yes: Flag.Boolean("yes").pipe(
    Flag.withAlias("y"),
    Flag.withDescription(
      "Restart the background service without asking. Required to restart it from a script, where there is no prompt.",
    ),
    Flag.withDefault(false),
  ),
};

const versionArgument = Argument.String("version").pipe(
  Argument.withDescription(
    "Exact stable version to install. Defaults to the newest published stable release.",
  ),
  Argument.optional,
);

export const updateCommand = Command.make("update", {
  ...updateFlags,
  version: versionArgument,
}).pipe(
  Command.withDescription(
    "Download a newer Liverary CLI and switch this machine to it, including the background service when one is installed.",
  ),
  Command.withHandler((flags) =>
    Effect.gen(function* () {
      const logLevel = yield* GlobalFlag.LogLevel;
      const config = yield* resolveCliAuthConfig(flags, logLevel);
      return yield* runUpdate({
        baseDir: config.baseDir,
        logsDir: config.logsDir,
        serverRuntimeStatePath: config.serverRuntimeStatePath,
        requestedVersion: Option.getOrUndefined(flags.version),
        allowDowngrade: flags.allowDowngrade,
        assumeYes: flags.yes,
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            CliService.layer(config),
            ProcessRunner.layer,
            FetchHttpClient.layer,
            ManagedPolicy.layer,
          ),
        ),
      );
    }),
  ),
);

const findForegroundServer = Effect.fn("cli.update.find_foreground_server")(function* (input: {
  readonly serverRuntimeStatePath: string;
  readonly serviceInstalled: boolean;
}) {
  const state = yield* readPersistedServerRuntimeState(input.serverRuntimeStatePath);
  if (Option.isNone(state) || state.value.serviceManaged || !isProcessAlive(state.value.pid)) {
    return undefined;
  }
  if (input.serviceInstalled && (yield* belongsToBootService(state.value.pid))) return undefined;
  return state.value;
});

const belongsToBootService = Effect.fn("cli.update.belongs_to_boot_service")(function* (
  pid: number,
) {
  const platform = yield* HostProcess.Platform;
  const fs = yield* FileSystem.FileSystem;
  const runner = yield* ProcessRunner.ProcessRunner;
  if (platform === "linux") {
    const cgroup = yield* fs.readFileString(`/proc/${pid}/cgroup`).pipe(Effect.option);
    return Option.isSome(cgroup) && cgroup.value.includes("/t3code.service");
  }
  if (platform === "darwin") {
    const parent = yield* runner
      .run({
        command: "ps",
        args: ["-o", "ppid=", "-p", String(pid)],
        timeout: Duration.seconds(5),
      })
      .pipe(Effect.option);
    const ppid = Option.isSome(parent) && parent.value.code === 0 ? parent.value.stdout.trim() : "";
    if (!/^\d+$/.test(ppid)) return false;
    const command = yield* runner
      .run({ command: "ps", args: ["-o", "command=", "-p", ppid], timeout: Duration.seconds(5) })
      .pipe(
        Effect.map((result) => (result.code === 0 ? result.stdout : "")),
        Effect.orElseSucceed(() => ""),
      );
    return /__service-launcher/.test(command);
  }
  return false;
});

export const runUpdate = Effect.fn("cli.update.run")(function* (input: {
  readonly baseDir: string;
  readonly logsDir: string;
  readonly serverRuntimeStatePath: string;
  readonly requestedVersion: string | undefined;
  readonly allowDowngrade: boolean;
  readonly assumeYes: boolean;
}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const runner = yield* ProcessRunner.ProcessRunner;
  const platform = yield* HostProcess.Platform;
  const arch = yield* HostProcess.Architecture;
  const environment = yield* HostProcess.Environment;
  const httpClient = yield* HttpClient.HttpClient;
  const service = yield* BootService.BootService;
  const policy = yield* ManagedPolicy.ManagedPolicy;
  const mirror = managedUpdateMirror(policy.document);

  const currentVersion = packageJson.version;
  const refusal = managedUpdateRefusal(policy.document);
  if (refusal !== undefined) {
    return yield* new CliUpdateError({ reason: refusal });
  }
  if (input.requestedVersion !== undefined && !isExactServiceVersion(input.requestedVersion)) {
    return yield* new CliUpdateError({
      reason: `'${input.requestedVersion}' is not an exact Liverary CLI version.`,
    });
  }
  const progress = createUpdateProgress();
  progress.status("Checking for updates...");
  const targetVersion = yield* (
    input.requestedVersion !== undefined
      ? Effect.succeed(input.requestedVersion)
      : mirror === undefined
        ? resolveNewestVersion()
        : resolveMirrorVersion(mirror)
  ).pipe(Effect.ensuring(Effect.sync(progress.finish)));

  const status = yield* service.status;
  // Service names are per user, so another home's unit belongs to a different install.
  const servesThisHome =
    status.installedBaseDir !== undefined &&
    (path.resolve(status.installedBaseDir) === path.resolve(input.baseDir) ||
      (yield* Effect.all([fs.realPath(status.installedBaseDir), fs.realPath(input.baseDir)]).pipe(
        Effect.map(([installed, current]) => installed === current),
        Effect.orElseSucceed(() => false),
      )));
  const serviceInstalled = status.supported && status.installed && servesThisHome;
  const foreground = yield* findForegroundServer({
    serverRuntimeStatePath: input.serverRuntimeStatePath,
    serviceInstalled,
  });
  const serviceVersion = serviceInstalled ? status.installedVersion : undefined;
  const executableCurrent = targetVersion === currentVersion;
  const restartPending = status.problems?.includes("restart-pending") === true;
  const serviceCurrent =
    !serviceInstalled ||
    (serviceVersion === targetVersion &&
      (executableCurrent ? status.current : (status.problems ?? []).length === 0));
  const newestInstalled =
    serviceVersion !== undefined && compareExactServiceVersions(serviceVersion, currentVersion) > 0
      ? serviceVersion
      : currentVersion;

  if (executableCurrent && serviceCurrent) {
    yield* Console.log(
      serviceVersion !== undefined
        ? `Liverary CLI and its background service are already on ${targetVersion}.`
        : `Liverary CLI is already on ${targetVersion}.`,
    );
    return;
  }
  if (!input.allowDowngrade && compareExactServiceVersions(targetVersion, newestInstalled) < 0) {
    return yield* new CliUpdateError({
      reason: `Liverary CLI ${targetVersion} is older than the installed ${newestInstalled}. Pass --allow-downgrade to install it anyway.`,
    });
  }

  const alreadyOnDisk = yield* fs
    .readFileString(pinnedRuntimePaths(path, input.baseDir, targetVersion, platform).sentinelPath)
    .pipe(
      Effect.map((sentinel) => sentinel.trim() === targetVersion),
      Effect.orElseSucceed(() => false),
    );

  progress.heading(
    executableCurrent && restartPending
      ? `The background service is still running the version before ${targetVersion}.`
      : executableCurrent
        ? `Updating the background service ${serviceVersion ?? "(unknown version)"} -> ${targetVersion}.`
        : alreadyOnDisk
          ? "Switching Liverary"
          : "Updating Liverary",
    executableCurrent ? "" : `${currentVersion} → ${targetVersion}`,
  );
  let restartService = false;
  if (serviceInstalled && !serviceCurrent) {
    yield* Console.log(
      "  A background service is installed for this Liverary data directory. Restarting it interrupts anything running in it: agent turns, terminals, remote clients.",
    );
    if (input.assumeYes) {
      restartService = true;
    } else if (process.stdin.isTTY && process.stdout.isTTY) {
      restartService = yield* Prompt.run(
        Prompt.Confirm({
          message: "Restart the background service once the download is verified?",
          initial: true,
        }),
      ).pipe(Effect.catchTags({ QuitError: () => Effect.succeed(false) }));
    } else {
      yield* Console.log(
        "  Not a terminal, so the service keeps running its current version. Rerun with --yes to restart it now, or run `liverary service restart` later.",
      );
    }
  }

  const runtime = yield* ensurePinnedRuntimeInstalled({
    onProgress: progress.report,
    baseDir: input.baseDir,
    version: targetVersion,
    fs,
    path,
    runner,
    httpClient,
    platform,
    arch,
    releaseBaseUrl: mirror?.feedUrl ?? (environment[CLI_RELEASE_BASE_URL_ENV]?.trim() || undefined),
    requirePublishedRelease: mirror !== undefined,
    validate: (paths) =>
      runner
        .run({
          command: pinnedRuntimeCommand(paths).command,
          args: [...pinnedRuntimeCommand(paths).args, "--version"],
          timeout: Duration.seconds(30),
        })
        .pipe(
          Effect.mapError(
            (cause) =>
              new PinnedRuntimeInstallError({
                step: "verifying the downloaded Liverary CLI",
                cause,
              }),
          ),
          Effect.flatMap((result) =>
            result.code === 0 && /\bv(\S+)\s*$/.exec(result.stdout)?.[1] === targetVersion
              ? Effect.void
              : Effect.fail(
                  new PinnedRuntimeInstallError({
                    step: "verifying the downloaded Liverary CLI",
                    exitCode: Number(result.code),
                  }),
                ),
          ),
        ),
  }).pipe(
    Effect.ensuring(Effect.sync(progress.finish)),
    Effect.catchIf(isUnpublishedRelease, () =>
      Effect.fail(
        new CliUpdateError({
          reason:
            mirror === undefined
              ? `No release archive was published for Liverary CLI ${targetVersion}.`
              : `${mirror.organization}'s update mirror has no Liverary CLI ${targetVersion} for this machine.`,
        }),
      ),
    ),
  );

  const launchedAs = (yield* HostProcess.IsExecutable) ? yield* resolveLauncherPath : undefined;
  const repointed = yield* repointLauncher({
    launchedAs,
    baseDir: input.baseDir,
    targetEntryPath: runtime.entryPath,
  });

  // Use today's service manager for the target version. Inside the service it hands off to
  // the target CLI, so stopping this process cannot interrupt the switch.
  let servicePlan: BootService.BootServicePlan | undefined;
  if (serviceInstalled && !serviceCurrent) {
    yield* Console.log(
      restartService
        ? "Restarting the background service..."
        : "Updating the background service...",
    );
    servicePlan = yield* BootService.BootService.pipe(
      Effect.flatMap((target) =>
        target.install({ allowDowngrade: input.allowDowngrade, start: restartService }),
      ),
      Effect.provide(
        BootService.layer({
          baseDir: input.baseDir,
          logsDir: input.logsDir,
          cliVersion: targetVersion,
        }),
      ),
      Effect.mapError(
        (error) =>
          new CliUpdateError({
            reason: `Liverary CLI ${targetVersion} is installed but the background service could not be ${restartService ? "updated" : "pointed at it"}: ${error.message}`,
          }),
      ),
    );
  }

  // A handed-off service install rewrites the unit later, while the old launcher may be stopped.
  if (servicePlan?.handedOff !== true) {
    // A stopped service's unit still names the launcher runtime it will start.
    const unit = yield* fs.readFileString(status.unitPath).pipe(Effect.option);
    yield* prunePinnedRuntimes({
      baseDir: input.baseDir,
      keep: [currentVersion, targetVersion],
      references: Option.toArray(Option.flatMapNullishOr(unit, BootService.bootServiceProgramOf)),
    });
  }

  progress.success(`Installed Liverary ${targetVersion}`);
  if (Option.isSome(repointed)) {
    yield* Console.log("  Run liverary to get started.\n");
  } else {
    yield* Console.log(`  Run ${runtime.entryPath}\n`);
  }
  if (servicePlan?.handedOff === true) {
    yield* Console.log(
      `  Background service switching to ${targetVersion} from a separate systemd unit, since this session runs inside it and disconnects when it restarts. Result: ${servicePlan.logPath}`,
    );
  } else if (servicePlan !== undefined && restartService) {
    yield* Console.log(`  Background service restarted on ${targetVersion}`);
  } else if (serviceInstalled && serviceCurrent) {
    yield* Console.log(`  Background service already on ${targetVersion}`);
  } else if (serviceInstalled) {
    // A pending restart means the service already points at serviceVersion but runs an older one.
    const running =
      serviceVersion === undefined
        ? "an unknown version"
        : restartPending
          ? `the version before ${serviceVersion}`
          : serviceVersion;
    yield* Console.log(
      `  Background service still running ${running}. Run \`liverary service restart\` when you are ready to switch it to ${targetVersion}.`,
    );
  } else if (status.installed && !servesThisHome) {
    yield* Console.log(
      `  The background service serves ${status.installedBaseDir ?? "another Liverary data directory"} and was left unchanged.`,
    );
  }
  if (foreground !== undefined) {
    yield* Console.log(
      `  A server started by hand is still running at ${foreground.origin} (pid ${foreground.pid}). Stop it and start it again to pick up ${targetVersion}.`,
    );
  }
});
