import * as Electron from "electron";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { DESKTOP_SCHEME, DESKTOP_URL } from "../electron/ElectronProtocol.ts";
import { desktopMessages } from "../locales/ko.ts";
import { DesktopDataMigrationError } from "./DesktopUserData.ts";

const legacyScheme = "liverary-dev";
const storageEntries = Schema.Array(Schema.Tuple([Schema.String, Schema.String]));
type StorageEntries = typeof storageEntries.Type;

export function missingStorageEntries(source: StorageEntries, destination: StorageEntries) {
  const existing = new Map(destination);
  return source.filter(([key, value]) => {
    if (!existing.has(key)) return true;
    if (existing.get(key) !== value) throw new Error(desktopMessages.rendererStorageConflict);
    return false;
  });
}

async function copyLegacyLocalStorage() {
  const session = Electron.session.defaultSession;
  const view = new Electron.WebContentsView({
    webPreferences: { session, sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  const contents = view.webContents;
  const registered: string[] = [];
  try {
    // Both pages must be inert while Chromium opens their origin-scoped stores.
    for (const scheme of [legacyScheme, DESKTOP_SCHEME]) {
      session.protocol.handle(
        scheme,
        () =>
          new Response("<!doctype html>", {
            headers: {
              "content-type": "text/html",
              "cache-control": "no-store",
              "content-security-policy": "default-src 'none'",
            },
          }),
      );
      registered.push(scheme);
    }
    const readEntries = async () =>
      Schema.decodeUnknownSync(storageEntries)(
        await contents.executeJavaScript(`Array.from({ length: localStorage.length }, (_, index) => {
          const key = localStorage.key(index);
          return [key, localStorage.getItem(key)];
        })`),
      );
    await contents.loadURL(`${legacyScheme}://app/`);
    const source = await readEntries();
    if (source.length === 0) return;
    await contents.loadURL(DESKTOP_URL);
    const missing = missingStorageEntries(source, await readEntries());
    if (missing.length > 0) {
      await contents.executeJavaScript(`for (const [key, value] of ${JSON.stringify(missing)}) {
        localStorage.setItem(key, value);
      }`);
    }
    session.flushStorageData();
  } finally {
    contents.close();
    for (const scheme of registered) session.protocol.unhandle(scheme);
  }
}

export const migrateLegacyRendererStorage = Effect.fn(
  "desktop.userData.migrateLegacyRendererStorage",
)(function* (profile: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const complete = path.join(profile, "renderer-storage-migrated");
  if (yield* fs.exists(complete)) return;
  const appData = path.dirname(profile);
  // Profile preparation has already verified that either legacy alias points at this profile.
  if (
    !(yield* fs.exists(path.join(appData, "liverary-dev"))) &&
    !(yield* fs.exists(path.join(appData, "t3-custom-dev")))
  )
    return;
  yield* Effect.tryPromise({
    try: copyLegacyLocalStorage,
    catch: (cause) => new DesktopDataMigrationError({ directory: profile, cause }),
  });
  yield* fs.writeFileString(complete, "");
});
