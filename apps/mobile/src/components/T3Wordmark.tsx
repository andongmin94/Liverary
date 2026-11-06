import { Image } from "expo-image";

import { T3_CODE_BRAND_MARK_SOURCE } from "./brandAssets";

export function T3Wordmark(props: { readonly height: number }) {
  return (
    <Image
      accessibilityLabel="Liverary"
      accessibilityIgnoresInvertColors
      contentFit="contain"
      source={T3_CODE_BRAND_MARK_SOURCE}
      style={{ height: props.height, width: props.height }}
    />
  );
}
