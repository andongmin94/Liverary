import { msg } from "gt-i18n";
import { m } from "../i18n/messages.ts";
// @effect-diagnostics nodeBuiltinImport:off - Probes the server's native SQLite ownership lock.
import * as NodeSqlite from "node:sqlite";

import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";

import { BACKEND_QUIT_STOP_TIMEOUT } from "./DesktopBackendManager.ts";

// The fields of the server's `server-runtime.json` that identify the owner of a T3 home.
const HomeOwnerRuntimeState = Schema.Struct({
  pid: Schema.Int,
  port: Schema.Int,
  serviceManaged: Schema.optional(Schema.Boolean),
  serverVersion: Schema.optional(Schema.String),
});
export type HomeOwner = typeof HomeOwnerRuntimeState.Type;

const decodeHomeOwner = Schema.decodeUnknownOption(Schema.fromJsonString(HomeOwnerRuntimeState));

/** Signal 0 only probes existence; EPERM still means alive. */
const isProcessAlive = (pid: number): boolean => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
};

/**
 * Whether a server holds the T3 home's ownership lock (an exclusive transaction on
 * `server-owner.sqlite`). A read-only read is refused with SQLITE_BUSY only while it is held.
 */
const isHomeOwnershipLocked = Effect.fn("DesktopHomeOwner.isHomeOwnershipLocked")(function* () {
  const path = yield* Path.Path;
  const { stateDir } = yield* DesktopEnvironment.DesktopEnvironment;
  const lockPath = path.join(stateDir, "server-owner.sqlite");
  return yield* Effect.sync(() => {
    try {
      const db = new NodeSqlite.DatabaseSync(lockPath, { readOnly: true });
      try {
        db.exec("PRAGMA busy_timeout = 0");
        db.prepare("SELECT count(*) FROM sqlite_master").get();
        return false;
      } finally {
        db.close();
      }
    } catch (cause) {
      // Anything but SQLITE_BUSY (a missing file included) leaves the decision to the backend.
      return cause instanceof Error && "errcode" in cause && cause.errcode === 5;
    }
  });
});

// A quitting app's backend holds the lock until it exits, which can outlast the relaunch of an update.
const HOME_OWNERSHIP_RELEASE_GRACE = Duration.sum(BACKEND_QUIT_STOP_TIMEOUT, Duration.seconds(3));
const HOME_OWNERSHIP_RELEASE_POLL_INTERVAL = Duration.millis(250);

/** Whether the ownership lock is free, or frees within the grace a shutting-down server needs. */
export const awaitHomeOwnershipRelease = Effect.fn("DesktopHomeOwner.awaitHomeOwnershipRelease")(
  function* () {
    while (yield* isHomeOwnershipLocked()) {
      yield* Effect.sleep(HOME_OWNERSHIP_RELEASE_POLL_INTERVAL);
    }
    return true;
  },
  Effect.timeoutOrElse({
    duration: HOME_OWNERSHIP_RELEASE_GRACE,
    orElse: () => Effect.succeed(false),
  }),
);

/** The live server recorded as owning the desktop's T3 home. Only call once the ownership lock is known held: a live PID alone may be reused. */
export const readLiveHomeOwner = Effect.fn("DesktopHomeOwner.readLiveHomeOwner")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { stateDir } = yield* DesktopEnvironment.DesktopEnvironment;
  const raw = yield* fs
    .readFileString(path.join(stateDir, "server-runtime.json"))
    .pipe(Effect.option);
  return Option.flatMap(raw, decodeHomeOwner).pipe(
    Option.filter((owner) => isProcessAlive(owner.pid)),
  );
});

export const homeOwnedMessage = (owner: Option.Option<HomeOwner>): string =>
  Option.match(owner, {
    onNone: () =>
      m(
        msg(
          "Another Liverary server, such as the background service, is using this data directory, or an older background service is set up for it. Stop that server or try `liverary update`. If the older launcher cannot update, run `liverary service uninstall` and optionally reinstall with `liverary service install` from a current CLI. Install the current Liverary CLI from https://github.com/andongmin94/Liverary/releases/latest if `liverary` is missing or outdated, and pass `--base-dir` with the service's Liverary data directory to each command. Then reopen Liverary. You can also set a separate T3CODE_HOME and pair with the running server.",
        ),
      ),
    onSome: (owner) => homeOwnedByServer(owner),
  });

const homeOwnedByServer = (owner: {
  readonly serviceManaged?: boolean | undefined;
  readonly pid: number;
  readonly port: number;
  readonly serverVersion?: string | undefined;
}) => {
  const kind = owner.serviceManaged
    ? m(msg("The Liverary background service"))
    : m(msg("Another Liverary server (for example `liverary serve` or a server started over SSH)"));
  const version = owner.serverVersion
    ? m(msg(", version {value0}", { value0: String(owner.serverVersion) }))
    : "";
  const stop = owner.serviceManaged
    ? m(
        msg(
          "Stop it with `liverary service uninstall`, using `--base-dir` to specify this Liverary data folder, then",
        ),
      )
    : m(
        msg(
          "If a Liverary app on another computer started this server over SSH, it will restart the server. Remove or disconnect that SSH environment or quit that app, then stop the server and",
        ),
      );
  return m(
    msg(
      "{kind} is using this Liverary data folder (PID {value1}, port {value2}{version}). {stop} reopen Liverary. You can also use a separate T3CODE_HOME and pair with the running server.",
      {
        kind: String(kind),
        value1: String(owner.pid),
        value2: String(owner.port),
        version: String(version),
        stop: String(stop),
      },
    ),
  );
};
