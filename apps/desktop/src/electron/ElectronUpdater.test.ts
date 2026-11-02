import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { CancellationToken } from "electron-updater";
import { vi } from "vite-plus/test";

const { downloadUpdateMock } = vi.hoisted(() => ({
  downloadUpdateMock: vi.fn(),
}));

vi.mock("electron-updater", async (importOriginal) => {
  const { CancellationToken } = await importOriginal<typeof import("electron-updater")>();
  return {
    CancellationToken,
    autoUpdater: { channel: "latest", downloadUpdate: downloadUpdateMock },
  };
});

import * as ElectronUpdater from "./ElectronUpdater.ts";

describe("ElectronUpdater", () => {
  it.effect("cancels the underlying download before a retry can reuse it", () =>
    Effect.scoped(
      Effect.gen(function* () {
        downloadUpdateMock.mockReset();
        const started = Promise.withResolvers<CancellationToken>();
        const cancelled = Promise.withResolvers<void>();
        const releaseCleanup = Promise.withResolvers<void>();
        let activeDownload: Promise<string[]> | null = null;
        let attempts = 0;
        downloadUpdateMock.mockImplementation((token = new CancellationToken()) => {
          if (activeDownload !== null) return activeDownload;
          attempts += 1;
          if (attempts > 1) {
            assert.isFalse(token.cancelled);
            return Promise.resolve(["installer.exe"]);
          }
          activeDownload = new Promise<string[]>((_resolve, reject) => {
            token.onCancel(() => reject(new Error("Download cancelled")));
          }).finally(async () => {
            cancelled.resolve();
            await releaseCleanup.promise;
            activeDownload = null;
          });
          started.resolve(token);
          return activeDownload;
        });

        const updates = yield* ElectronUpdater.ElectronUpdater;
        const downloading = yield* updates.downloadUpdate.pipe(Effect.forkScoped);
        const token = yield* Effect.promise(() => started.promise);
        const interrupting = yield* Fiber.interrupt(downloading).pipe(Effect.forkScoped);

        yield* Effect.gen(function* () {
          yield* Effect.raceFirst(
            Effect.promise(() => cancelled.promise),
            Fiber.join(interrupting),
          );
          assert.isTrue(token.cancelled);
          assert.isUndefined(interrupting.pollUnsafe());
        }).pipe(Effect.ensuring(Effect.sync(() => releaseCleanup.resolve())));
        yield* Fiber.join(interrupting);

        assert.isNull(activeDownload);
        yield* updates.downloadUpdate;
        assert.equal(attempts, 2);
      }),
    ).pipe(Effect.provide(ElectronUpdater.layer)),
  );
});
