import { expect, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as PubSub from "effect/PubSub";
import * as Queue from "effect/Queue";
import * as TestClock from "effect/testing/TestClock";
import * as ProviderInstanceRegistry from "../provider/ProviderInstanceRegistry.ts";
import { NativeSessionSync } from "./NativeSessionSync.ts";
import * as NativeSessionSyncWorker from "./NativeSessionSyncWorker.ts";

it.effect(
  "retains registry changes during startup retry and keeps periodic sync from retrying failures",
  () =>
    Effect.gen(function* () {
      const changes = yield* PubSub.unbounded<void>();
      const startupRetry = yield* Deferred.make<void>();
      const releaseStartup = yield* Deferred.make<void>();
      const registryRetried = yield* Deferred.make<void>();
      const synced = yield* Queue.unbounded<number>();
      let attempts = 0;
      yield* NativeSessionSyncWorker.run.pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(ProviderInstanceRegistry.ProviderInstanceRegistry)({
              listInstances: Effect.succeed([]),
              subscribeChanges: PubSub.subscribe(changes),
            }),
            Layer.mock(NativeSessionSync)({
              retryFailedLifecycle: Effect.gen(function* () {
                attempts++;
                if (attempts === 1) {
                  yield* Deferred.succeed(startupRetry, undefined);
                  yield* Deferred.await(releaseStartup);
                } else {
                  yield* Deferred.succeed(registryRetried, undefined);
                }
              }),
              sync: Effect.suspend(() => Queue.offer(synced, attempts)).pipe(Effect.asVoid),
            }),
            FileSystem.layerNoop({}),
          ),
        ),
        Effect.forkScoped,
      );
      yield* Deferred.await(startupRetry);
      yield* PubSub.publish(changes, undefined);
      yield* Deferred.succeed(releaseStartup, undefined);
      expect(yield* Queue.take(synced)).toBeGreaterThanOrEqual(1);
      yield* Deferred.await(registryRetried);
      yield* TestClock.adjust("3 seconds");
      expect(yield* Queue.take(synced)).toBe(2);
      yield* TestClock.adjust("33 seconds");
      expect(yield* Queue.take(synced)).toBe(2);
      expect(attempts).toBe(2);
    }).pipe(Effect.scoped),
);
