import { NativeSessionError } from "@t3tools/provider-core/server/nativeSessions";
import { spawnAndCollect } from "@t3tools/provider-core/server/snapshotProbe";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as ChildProcess from "effect/process/ChildProcess";

const encodeJson = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));

export const runClaudeHistoryOperation = Effect.fn("runClaudeWorker")(function* (input: {
  readonly method: "listSessions" | "getSessionMessages" | "deleteSession" | "forkSession";
  readonly sessionId?: string;
  readonly options?: object;
  readonly environment: NodeJS.ProcessEnv;
}) {
  const path = yield* Path.Path;
  const fromSource = import.meta.url.endsWith(".ts");
  // The SDK resolves history through process.env; a worker isolates each provider's Claude home.
  const workerArguments = (yield* HostProcess.IsExecutable)
    ? ["__claude-history"]
    : [
        ...(fromSource ? ["--experimental-strip-types"] : []),
        yield* path.fromFileUrl(
          new URL(
            fromSource ? "../claude-history-worker.ts" : "./claude-history-worker.mjs",
            import.meta.url,
          ),
        ),
      ];
  const executable = yield* HostProcess.ExecutablePath;
  const result = yield* spawnAndCollect(
    executable,
    ChildProcess.make(
      executable,
      [...workerArguments, input.method, input.sessionId ?? "-", encodeJson(input.options ?? {})],
      { env: { ...input.environment, ELECTRON_RUN_AS_NODE: "1" } },
    ),
  ).pipe(
    Effect.timeout("30 seconds"),
    Effect.mapError(
      (cause) =>
        new NativeSessionError({
          operation: input.method,
          detail: "Claude history worker could not complete.",
          cause,
        }),
    ),
  );
  if (result.code !== 0) {
    return yield* new NativeSessionError({
      operation: input.method,
      detail: result.stderr.trim() || `Claude history worker exited with code ${result.code}.`,
    });
  }
  return result.stdout;
});
