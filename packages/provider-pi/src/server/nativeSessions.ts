import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { expandHomePath } from "@t3tools/provider-core/server/pathExpansion";
import {
  NativeSessionError,
  type NativeSessionSummary,
  type ProviderNativeSessions,
} from "@t3tools/provider-core/server/nativeSessions";
import { piLaunchSessionDir, resolvePiSessionsDir } from "./usage.ts";
import { parsePiNativeSession } from "./sessionTranscript.ts";

export const makePiNativeSessions = Effect.fn("PiNativeSessions.make")(function* (
  environment: NodeJS.ProcessEnv,
  launchArgs: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const home = yield* HostProcess.HomeDirectory;
  const platform = yield* HostProcess.Platform;
  const launchHome = (platform === "win32" ? environment.USERPROFILE : environment.HOME) || home;
  const configured = piLaunchSessionDir(launchArgs);
  const launchDir = configured === undefined ? undefined : expandHomePath(configured, launchHome);
  const defaultDir = resolvePiSessionsDir(environment, launchHome, path);
  const roots = (cwd?: string) => [
    ...new Set([
      defaultDir,
      ...(launchDir && (path.isAbsolute(launchDir) || cwd)
        ? [path.resolve(cwd ?? defaultDir, launchDir)]
        : []),
    ]),
  ];
  const failure = (operation: string) => (cause: unknown) =>
    new NativeSessionError({
      operation,
      detail: "Pi session files could not be accessed.",
      ...(operation === "read" &&
      PlatformError.isPlatformError(cause) &&
      cause.reason._tag === "NotFound"
        ? { notFound: true }
        : {}),
      cause,
    });
  const readDirectory = (directory: string) =>
    fs.readDirectory(directory).pipe(
      Effect.catchIf(
        (error) => error.reason._tag === "NotFound",
        () => Effect.succeed<string[]>([]),
      ),
    );
  const within = (file: string, root: string) => {
    const relative = path.relative(root, file);
    return (
      relative !== "" &&
      !relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative)
    );
  };
  const load = Effect.fn("PiNativeSessions.load")(function* (file: string) {
    const stat = yield* fs.stat(file);
    const contents = yield* fs.readFileString(file);
    return parsePiNativeSession(
      contents,
      file,
      Option.isSome(stat.mtime) ? stat.mtime.value.getTime() : 0,
    );
  });
  const checkedPath = Effect.fn("PiNativeSessions.checkedPath")(function* (
    nativeId: string,
    cwd: string,
  ) {
    const file = yield* fs.realPath(nativeId);
    let allowed = false;
    for (const root of roots(cwd)) {
      const canonical = yield* fs.realPath(root).pipe(
        Effect.catchIf(
          (error) => error.reason._tag === "NotFound",
          () => Effect.succeed(root),
        ),
      );
      if (within(file, canonical)) allowed = true;
    }
    if (!allowed || !file.endsWith(".jsonl"))
      return yield* new NativeSessionError({
        operation: "read",
        detail: "The file is outside this Pi session store.",
      });
    const session = yield* load(file);
    if (!session)
      return yield* new NativeSessionError({
        operation: "read",
        detail: "The file is not a saved Pi session.",
      });
    return { file, session };
  });

  return {
    scope: launchDir && !path.isAbsolute(launchDir) ? "workspace" : "global",
    watchPaths: roots(),
    deletionScope: "session",
    list: Effect.fn("PiNativeSessions.list")(
      function* ({ cwd }) {
        const sessions = new Map<string, NativeSessionSummary>();
        let complete = true;
        for (const root of roots(cwd)) {
          for (const entry of yield* readDirectory(root)) {
            const entryPath = path.join(root, entry);
            const stat = yield* fs.stat(entryPath);
            const files =
              stat.type === "Directory"
                ? (yield* readDirectory(entryPath))
                    .filter((name) => name.endsWith(".jsonl"))
                    .map((name) => path.join(entryPath, name))
                : entry.endsWith(".jsonl")
                  ? [entryPath]
                  : [];
            for (const filePath of files) {
              const file = yield* fs.realPath(filePath);
              const canonicalRoot = yield* fs.realPath(root);
              if (!within(file, canonicalRoot)) {
                complete = false;
                continue;
              }
              const session = yield* load(file);
              if (session) sessions.set(file, session.summary);
              else complete = false;
            }
          }
        }
        return { sessions: [...sessions.values()], complete };
      },
      Effect.mapError(failure("list")),
    ),
    read: ({ nativeId, cwd }) =>
      checkedPath(nativeId, cwd).pipe(
        Effect.map(({ session }) => session.messages),
        Effect.mapError(failure("read")),
      ),
    delete: ({ nativeId, cwd }) =>
      checkedPath(nativeId, cwd).pipe(
        Effect.flatMap(({ file }) => fs.remove(file)),
        Effect.mapError(failure("delete")),
      ),
  } satisfies ProviderNativeSessions;
});
