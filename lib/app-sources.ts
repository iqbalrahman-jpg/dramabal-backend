export const APP_SOURCES = [
  "HiShort",
  "MicroDrama",
  "MeloShort",
  "StardustTV",
  "SnackShort",
  "Velolo",
  "FreeReels",
  "FlickReels",
  "DotDrama",
  "StarShort",
  "RapidTV",
  "MinuteDrama",
  "DramaBox",
  "CashDrama",
  "ShotShort",
  "SodaReels",
  "RadReels",
  "DramaNow",
  "Shorten",
  "ShortSky",
  "FlickShort",
  "DramaDash",
  "DramaWave",
  "DramaRush"
] as const;

export type AppSource = (typeof APP_SOURCES)[number];

const APP_LOOKUP: Record<string, AppSource> = Object.fromEntries(
  APP_SOURCES.map((name) => [name.toLowerCase(), name])
) as Record<string, AppSource>;

export function resolveAppSource(value: string): AppSource | null {
  return APP_LOOKUP[value.toLowerCase()] ?? null;
}
