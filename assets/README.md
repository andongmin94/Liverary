# Brand icons

The development and Liverary Icon Composer projects supply application icons:

- `dev/app-icon.icon`: development assets.
- `custom/app-icon.icon`: published Liverary assets.

Run `vp run icons:export` from the repository root to regenerate iOS, Linux,
Windows, and web exports. Development web exports are copied to `apps/web/public`.
Run `vp run icons:check` to compare generated assets without changing files.

Exporting requires Icon Composer 2 or newer on macOS. The script selects an
exporter from Xcode or a standalone installation and pins design generation 26.
`ICON_COMPOSER_TOOL` can specify the full path to `ictool`.

## macOS exports

The command-line exporter does not expose the `macOS pre-Tahoe` preset, so the
export script leaves tracked macOS PNGs unchanged. After changing a project,
export it in Icon Composer with Platform `macOS pre-Tahoe`, Appearance `Default`,
Size `1024pt`, and Scale `1×`:

- `dev/app-icon.icon` → `dev/blueprint-macos-1024.png`.
- `custom/app-icon.icon` → `custom/liverary-macos-1024.png`.

Keep the 824×824 opaque body inset 100 pixels within the 1024×1024 PNG and the
native shadow. Do not resize the exports or edit generated PNG/ICO files directly.

## Android launcher and splash artwork

Android adaptive icons and splash screens apply their own masks. Run
`vp run icons:export:android` to render the separate foreground and background
layers within those safe areas:

- `apps/mobile/assets/android-icon-foreground.png`: shared transparent mark.
- `apps/mobile/assets/android-icon-background-dev.png`: development artwork.
- `apps/mobile/assets/android-splash-icon-dev.png` and `-prod.png`: composed
  development and production splash images. Production uses a solid background.

`android-icon-mark.png` is the silhouette used for Android monochrome icons.
