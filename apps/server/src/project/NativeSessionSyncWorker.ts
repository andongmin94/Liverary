import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Stream from "effect/Stream";
import * as ProviderInstanceRegistry from "../provider/ProviderInstanceRegistry.ts";
import { NativeSessionSync } from "./NativeSessionSync.ts";

/** Files invalidate the catalog; only the provider's own APIs determine session state. */
export const run = Effect.gen(function* () {
  const registry = yield* ProviderInstanceRegistry.ProviderInstanceRegistry;
  const sync = yield* NativeSessionSync;
  const fs = yield* FileSystem.FileSystem;
  const instanceChanges = yield* registry.subscribeChanges;
  const retryFailed = sync.retryFailedLifecycle.pipe(Effect.ignoreCause({ log: true }));
  yield* retryFailed;
  const paths = new Set(
    (yield* registry.listInstances).flatMap((instance) =>
      instance.enabled ? (instance.nativeSessions?.watchPaths ?? []) : [],
    ),
  );
  const changes = Stream.mergeAll(
    [
      Stream.fromSubscription(instanceChanges).pipe(Stream.tap(() => retryFailed)),
      // Providers without filesystem notifications and newly configured paths are refreshed too.
      Stream.tick("30 seconds"),
      ...Array.from(paths, (path) =>
        fs.watch(path, { recursive: true }).pipe(
          Stream.map(() => undefined),
          Stream.catch(() => Stream.empty),
        ),
      ),
    ],
    { concurrency: "unbounded" },
  );
  yield* Stream.merge(
    Stream.succeed(undefined),
    changes.pipe(Stream.groupedWithin(1024, "3 seconds")),
  ).pipe(
    Stream.buffer({ capacity: 1, strategy: "sliding" }),
    Stream.runForEach(() => sync.sync.pipe(Effect.ignoreCause({ log: true }))),
  );
});
