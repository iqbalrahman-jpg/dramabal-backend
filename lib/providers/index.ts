import { resolveAppSource } from "@/lib/app-sources";
import { DramaWaveProvider } from "@/lib/providers/dramawave";
import { HiShortProvider } from "@/lib/providers/hishort";
import { MeloShortProvider } from "@/lib/providers/meloshort";
import { MicroDramaProvider } from "@/lib/providers/microdrama";
import { SnackShortProvider } from "@/lib/providers/snackshort";
import { StardustTVProvider } from "@/lib/providers/stardusttv";
import type { ProductProvider } from "@/lib/providers/types";

export function resolveProvider(app: string): {
  appName: string | null;
  provider: ProductProvider | null;
} {
  const appName = resolveAppSource(app);

  if (!appName) {
    return { appName: null, provider: null };
  }

  if (appName === "HiShort") {
    return {
      appName,
      provider: new HiShortProvider()
    };
  }

  if (appName === "MicroDrama") {
    return {
      appName,
      provider: new MicroDramaProvider()
    };
  }

  if (appName === "MeloShort") {
    return {
      appName,
      provider: new MeloShortProvider()
    };
  }

  if (appName === "DramaWave") {
    return {
      appName,
      provider: new DramaWaveProvider()
    };
  }

  if (appName === "StardustTV") {
    return {
      appName,
      provider: new StardustTVProvider()
    };
  }

  if (appName === "SnackShort") {
    return {
      appName,
      provider: new SnackShortProvider()
    };
  }

  return {
    appName,
    provider: null
  };
}
