import { resolveAppSource } from "@/lib/app-sources";
import { HiShortProvider } from "@/lib/providers/hishort";
import { MicroDramaProvider } from "@/lib/providers/microdrama";
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

  return {
    appName,
    provider: null
  };
}
