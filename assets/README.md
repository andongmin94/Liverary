# Brand icons

Liverary uses `custom/liverary-app-icon.svg` as the canonical application icon.
Keep the supplied SVG unchanged; regenerate its derived assets instead of editing
PNG, ICO, public SVG copies, or the DMG inset directly.

Run `vp run icons:export` from the repository root to regenerate the 1024px PNGs,
Windows multi-size ICO, web icons, public logo, Icon Composer SVG copy, DMG
and inset. These production exports
use the existing Sharp dependency and work on
Windows, macOS, and Linux. Liverary development and packaged apps use these same
custom assets. The Windows ICO contains 16, 24, 32, 48, 64, 128, and 256px images.
Run `vp run icons:check` to compare generated assets without changing files.

`custom/app-icon.icon` retains the same supplied SVG for Icon Composer editing;
it is not required for generating the Liverary PNG/ICO assets.

## Legacy development artwork

The separate upstream `dev/app-icon.icon` artwork is retained without changing
Liverary's branding. Export it deliberately with
`vp run icons:export --brand development` (or `--brand all` for both sets).
This legacy export requires Icon Composer 2 or newer on macOS. The script selects
an exporter from Xcode or a standalone installation and pins design generation 26. `ICON_COMPOSER_TOOL` can specify the full path to `ictool`.

The legacy command-line exporter does not expose the `macOS pre-Tahoe` preset,
so `dev/blueprint-macos-1024.png` remains a manual Icon Composer export with
Platform `macOS pre-Tahoe`, Appearance `Default`, Size `1024pt`, and Scale `1×`.
