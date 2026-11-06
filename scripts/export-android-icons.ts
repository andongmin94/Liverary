#!/usr/bin/env node

// Android masks a 72dp safe area inside 108dp; center the supplied mark inside it.

import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import sharp from "sharp";

import { BRAND_ASSET_PATHS } from "./lib/brand-assets.ts";

type IconVariant = "dev" | "prod";

const ADAPTIVE_CANVAS = 432;
const SPLASH_CANVAS = 1152;
const TEXT = { x: 15.53, y: 37, width: 94.5, height: 57 };
const WORDMARK_FRACTION = 0.48;
const SVG_DENSITY = 300;
const OUTPUT_DIRECTORY = "apps/mobile/assets";
const PRODUCTION_BACKGROUND_COLOR = "#000000";

export class AndroidIconRenderError extends Schema.TaggedError<AndroidIconRenderError>()(
  "AndroidIconRenderError",
  { layer: Schema.String, cause: Schema.Defect() },
) {}

const wordmarkTransform = (size: number) => {
  const scale = (size * WORDMARK_FRACTION) / TEXT.width;
  const tx = (size - TEXT.width * scale) / 2 - TEXT.x * scale;
  const ty = (size - TEXT.height * scale) / 2 - TEXT.y * scale;
  return `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(4)})`;
};

const canvasSvg = (size: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">${inner}</svg>`;

// Remove the iOS 10pt corner clip; Android's own mask needs full bleed.
const fullBleed = (svg: string) =>
  svg.replace(/<rect width="128" height="128" rx="10"\/>/, '<rect width="128" height="128"/>');

const rasterize = (layer: string, svg: string, width: number, height = width) =>
  Effect.tryPromise({
    try: () =>
      sharp(Buffer.from(svg), { density: SVG_DENSITY }).resize(width, height).png().toBuffer(),
    catch: (cause) => new AndroidIconRenderError({ layer, cause }),
  });

const composite = (
  layer: string,
  base: Buffer,
  overlays: ReadonlyArray<{ input: Buffer; left?: number; top?: number }>,
) =>
  Effect.tryPromise({
    try: () =>
      sharp(base)
        .composite([...overlays])
        .png()
        .toBuffer(),
    catch: (cause) => new AndroidIconRenderError({ layer, cause }),
  });

const solidCanvas = (layer: string, size: number, background: string) =>
  Effect.tryPromise({
    try: () =>
      sharp({ create: { width: size, height: size, channels: 4, background } })
        .png()
        .toBuffer(),
    catch: (cause) => new AndroidIconRenderError({ layer, cause }),
  });

const readLayerSource = Effect.fn("androidIcons.readLayerSource")(function* (
  repositoryRoot: string,
  variant: IconVariant,
  file: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  return yield* fs.readFileString(
    path.join(repositoryRoot, "assets", variant, "app-icon.icon", "Assets", file),
  );
});

const renderForeground = Effect.fn("androidIcons.renderForeground")(function* (
  repositoryRoot: string,
  size: number,
  monochrome = false,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const source = yield* fs.readFileString(
    path.join(repositoryRoot, BRAND_ASSET_PATHS.productionIconSvg),
  );
  let mark = source;
  if (monochrome) {
    const whitePaths = source.match(/<path[^>]*fill="white"[^>]*\/>/g);
    if (!whitePaths) {
      return yield* Effect.die(new Error("The Liverary source SVG is missing its white mark."));
    }
    mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="55.75 41.5 87.75 117">${whitePaths.join("")}</svg>`;
  }
  const markSize = size * WORDMARK_FRACTION;
  const offset = (size - markSize) / 2;
  return yield* rasterize(
    "foreground",
    canvasSvg(
      size,
      `<image x="${offset}" y="${offset}" width="${markSize}" height="${markSize}" href="data:image/svg+xml;base64,${Buffer.from(mark).toString("base64")}"/>`,
    ),
    size,
  );
});

const renderDevelopmentBackground = Effect.fn("androidIcons.renderDevelopmentBackground")(
  function* (repositoryRoot: string, size: number) {
    const annotations = yield* readLayerSource(repositoryRoot, "dev", "annotations.svg");
    const defs = annotations.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? "";
    const body = annotations.replace(/^[\s\S]*?<\/defs>/, "").replace(/<\/svg>\s*$/, "");
    const paper = yield* readLayerSource(repositoryRoot, "dev", "background.svg");
    const background = yield* rasterize("dev-background", fullBleed(paper), size);
    const overlay = yield* rasterize(
      "dev-annotations",
      canvasSvg(size, `${defs}<g transform="${wordmarkTransform(size)}">${body}</g>`),
      size,
    );
    return yield* composite("dev-background", background, [{ input: overlay }]);
  },
);

const renderBackground = Effect.fn("androidIcons.renderBackground")(function* (
  repositoryRoot: string,
  variant: IconVariant,
  size: number,
) {
  switch (variant) {
    case "dev":
      return yield* renderDevelopmentBackground(repositoryRoot, size);
    case "prod":
      return yield* solidCanvas("prod-background", size, PRODUCTION_BACKGROUND_COLOR);
  }
});

const renderSplashIcon = Effect.fn("androidIcons.renderSplashIcon")(function* (
  repositoryRoot: string,
  variant: IconVariant,
) {
  const background = yield* renderBackground(repositoryRoot, variant, SPLASH_CANVAS);
  const foreground = yield* renderForeground(repositoryRoot, SPLASH_CANVAS);
  return yield* composite(`${variant}-splash`, background, [{ input: foreground }]);
});

const renderNotificationVector = Effect.fn("androidIcons.renderNotificationVector")(function* (
  repositoryRoot: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const source = yield* fs.readFileString(
    path.join(repositoryRoot, BRAND_ASSET_PATHS.productionIconSvg),
  );
  const whitePath = source.match(/<path[^>]*fill="white"[^>]*\/>/)?.[0];
  const pathData = whitePath?.match(/\bd="([^"]+)"/)?.[1];
  if (!pathData) {
    return yield* Effect.die(new Error("The Liverary source SVG is missing its white mark path."));
  }
  return Buffer.from(
    `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp"
    android:viewportWidth="120" android:viewportHeight="120">
    <group android:translateX="-39.625" android:translateY="-40">
        <path android:fillColor="#FFFFFFFF" android:fillType="evenOdd"
            android:pathData="${pathData}" />
    </group>
</vector>
`,
  );
});

export const renderAndroidIcons = Effect.fn("androidIcons.render")(function* (
  repositoryRoot: string,
) {
  const outputs = [
    ["android-icon-foreground.png", yield* renderForeground(repositoryRoot, ADAPTIVE_CANVAS)],
    [
      "android-icon-background-dev.png",
      yield* renderDevelopmentBackground(repositoryRoot, ADAPTIVE_CANVAS),
    ],
    ["android-splash-icon-dev.png", yield* renderSplashIcon(repositoryRoot, "dev")],
    ["android-splash-icon-prod.png", yield* renderSplashIcon(repositoryRoot, "prod")],
    ["android-icon-mark.png", yield* renderForeground(repositoryRoot, ADAPTIVE_CANVAS, true)],
    ["android-notification-icon.png", yield* renderForeground(repositoryRoot, 96, true)],
  ] as const;
  const assets = new Map(
    outputs.map(([name, contents]) => [`${OUTPUT_DIRECTORY}/${name}`, contents]),
  );
  assets.set(
    "apps/mobile/modules/t3-agent-notifications/android/src/main/res/drawable/agent_activity_mark.xml",
    yield* renderNotificationVector(repositoryRoot),
  );
  return assets;
});

const exportAndroidIcons = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const repositoryRoot = path.resolve(import.meta.dirname, "..");
  const outputs = yield* renderAndroidIcons(repositoryRoot);
  for (const [relativePath, contents] of outputs) {
    yield* fs.writeFile(path.join(repositoryRoot, relativePath), contents);
    yield* Console.log(`wrote ${relativePath}`);
  }
});

if (import.meta.main) {
  exportAndroidIcons.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
}
