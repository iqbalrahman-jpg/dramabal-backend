import { upstreamGet } from "@/lib/upstream";
import type { CardItem, DramaDetail, EpisodeDetail, ProductProvider } from "@/lib/providers/types";

type StardustCard = {
  id?: string;
  slug?: string;
  title?: string;
  poster?: string;
};

type StardustListResponse = {
  data?: StardustCard[];
  cached?: boolean;
  ttl?: number;
};

type StardustEpisodeSource = {
  h264?: string;
  h265?: string;
};

type StardustDetailResponse = {
  data?: {
    id?: string;
    slug?: string;
    title?: string;
    poster?: string;
    totalEpisodes?: number;
    episodes?: Record<string, StardustEpisodeSource>;
  };
  cached?: boolean;
  ttl?: number;
};

const DEFAULT_BASE_URL = "https://captain.sapimu.au/stardusttv/api/v1";

function requireToken(): string {
  const token = process.env.PARENT_API_TOKEN;

  if (!token) {
    throw new Error("PARENT_API_TOKEN is not set");
  }

  return token;
}

function getBaseUrl(): string {
  const configured = process.env.STARDUSTTV_API_BASE_URL;

  if (!configured) {
    return DEFAULT_BASE_URL;
  }

  return configured.replace(/\/+$/, "");
}

function buildDramaKey(slug: string, id: string): string {
  return `${slug}/${id}`;
}

function parseDramaKey(value: string): { slug: string; id: string } {
  const normalized = decodeURIComponent(value).trim();

  const bySlash = normalized.split("/").filter(Boolean);
  if (bySlash.length >= 2) {
    return {
      slug: bySlash.slice(0, -1).join("/"),
      id: bySlash[bySlash.length - 1]
    };
  }

  const byPipe = normalized.split("|").filter(Boolean);
  if (byPipe.length === 2) {
    return { slug: byPipe[0], id: byPipe[1] };
  }

  throw new Error("Invalid drama id. Expected format: {slug}/{id}");
}

function parseEpisodeSlug(value: string): { dramaKey: string; episodeNumber: number } {
  const splitAt = value.lastIndexOf("_");

  if (splitAt <= 0 || splitAt >= value.length - 1) {
    throw new Error("Invalid episode slug. Expected format: {slug}/{id}_{episodeNumber}");
  }

  const dramaKey = value.slice(0, splitAt);
  const numberRaw = value.slice(splitAt + 1);
  const episodeNumber = Number.parseInt(numberRaw, 10);

  if (!Number.isInteger(episodeNumber) || episodeNumber <= 0) {
    throw new Error("Invalid episode slug. Episode number must be a positive integer");
  }

  return { dramaKey, episodeNumber };
}

function pickEpisodeUrl(source?: StardustEpisodeSource): string {
  if (!source) {
    return "";
  }

  return source.h264 ?? source.h265 ?? "";
}

function mapCard(item: StardustCard): CardItem {
  const slug = item.slug ?? "";
  const id = item.id ?? "";

  return {
    id: slug && id ? buildDramaKey(slug, id) : "",
    title: item.title ?? "Untitled",
    thumbnail: item.poster ?? null
  };
}

async function fetchDetailByKey(dramaKey: string): Promise<StardustDetailResponse> {
  const { slug, id } = parseDramaKey(dramaKey);
  const params = new URLSearchParams({ lang: "id" });

  return upstreamGet<StardustDetailResponse>(
    `${getBaseUrl()}/video/${encodeURIComponent(slug)}/${encodeURIComponent(id)}?${params.toString()}`,
    requireToken()
  );
}

export class StardustTVProvider implements ProductProvider {
  async dashboard() {
    const params = new URLSearchParams({ lang: "id" });
    const payload = await upstreamGet<StardustListResponse>(
      `${getBaseUrl()}/homepage?${params.toString()}`,
      requireToken()
    );

    const items = (payload.data ?? []).map(mapCard).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async search(keyword: string) {
    const params = new URLSearchParams({ q: keyword, lang: "id" });
    const payload = await upstreamGet<StardustListResponse>(
      `${getBaseUrl()}/search?${params.toString()}`,
      requireToken()
    );

    const items = (payload.data ?? []).map(mapCard).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async detail(dramaId: string): Promise<DramaDetail> {
    const payload = await fetchDetailByKey(dramaId);
    const data = payload.data ?? {};
    const parsed = parseDramaKey(dramaId);
    const slug = parsed.slug;
    const id = data.id ?? parsed.id;
    const dramaKey = buildDramaKey(slug, id);

    const episodeEntries = Object.entries(data.episodes ?? {})
      .map(([key, source]) => ({
        key,
        number: Number.parseInt(key, 10),
        source
      }))
      .filter((item) => Number.isInteger(item.number) && item.number > 0)
      .sort((a, b) => a.number - b.number);

    const episodes = episodeEntries.map((item) => ({
      id: `${dramaKey}_${item.number}`,
      number: item.number,
      url: pickEpisodeUrl(item.source)
    }));

    return {
      id: dramaKey,
      title: data.title ?? "Untitled",
      thumbnail: data.poster ?? null,
      synopsis: null,
      totalEpisodes: data.totalEpisodes ?? episodes.length,
      episodes
    };
  }

  async episodes(dramaId: string) {
    const detail = await this.detail(dramaId);

    return {
      dramaId: detail.id,
      items: detail.episodes,
      total: detail.episodes.length
    };
  }

  async episode(slug: string): Promise<EpisodeDetail> {
    const { dramaKey, episodeNumber } = parseEpisodeSlug(slug);
    const payload = await fetchDetailByKey(dramaKey);
    const source = payload.data?.episodes?.[String(episodeNumber)];

    return {
      id: slug,
      title: `Episode ${episodeNumber}`,
      url: pickEpisodeUrl(source),
      subtitle: ""
    };
  }
}
