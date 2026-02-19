import { upstreamGet } from "@/lib/upstream";
import type { CardItem, DramaDetail, EpisodeDetail, ProductProvider } from "@/lib/providers/types";

type DramaWaveDashboardItem = {
  id?: string;
  key?: string;
  name?: string;
  title?: string;
  cover?: string;
  chapter_id?: string;
  chapter_name?: string;
  first_frame?: string;
};

type DramaWaveDashboardResponse = {
  code?: number;
  data?: DramaWaveDashboardItem[] | { items?: DramaWaveDashboardItem[]; list?: DramaWaveDashboardItem[] };
};

type DramaWaveSearchEpisode = {
  external_audio_h264_m3u8?: string;
  external_audio_h265_m3u8?: string;
  m3u8_url?: string;
  video_url?: string;
  subtitle_list?: Array<{
    language?: string;
    subtitle?: string;
  }>;
};

type DramaWaveSearchItem = {
  id?: string;
  name?: string;
  title?: string;
  cover?: string;
  episode?: DramaWaveSearchEpisode;
};

type DramaWaveSearchResponse = {
  code?: number;
  message?: string;
  data?: DramaWaveSearchItem[] | { items?: DramaWaveSearchItem[]; list?: DramaWaveSearchItem[] };
};

type DramaWaveDetailEpisode = {
  id?: string;
  index?: number;
  name?: string;
  external_audio_h264_m3u8?: string;
  external_audio_h265_m3u8?: string;
  m3u8_url?: string;
  video_url?: string;
  subtitle_list?: Array<{
    language?: string;
    subtitle?: string;
  }>;
};

type DramaWaveDetailResponse = {
  code?: number;
  message?: string;
  data?: {
    info?: {
      id?: string;
      name?: string;
      desc?: string;
      cover?: string;
      episode_count?: number;
      episode_list?: DramaWaveDetailEpisode[];
    };
  };
};

const DEFAULT_BASE_URL = "https://captain.sapimu.au/dramawave/api/v1";

function requireToken(): string {
  const token = process.env.PARENT_API_TOKEN;

  if (!token) {
    throw new Error("PARENT_API_TOKEN is not set");
  }

  return token;
}

function getBaseUrl(): string {
  const configured = process.env.DRAMAWAVE_API_BASE_URL;

  if (!configured) {
    return DEFAULT_BASE_URL;
  }

  return configured.replace(/\/+$/, "");
}

function pickVideoUrl(source?: {
  external_audio_h264_m3u8?: string;
  external_audio_h265_m3u8?: string;
  m3u8_url?: string;
  video_url?: string;
}): string {
  if (!source) {
    return "";
  }

  return (
    source.external_audio_h264_m3u8 ?? source.external_audio_h265_m3u8 ?? source.m3u8_url ?? source.video_url ?? ""
  );
}

function pickSubtitle(
  subtitles: Array<{
    language?: string;
    subtitle?: string;
  }> = []
): string {
  const usable = subtitles.filter((item) => Boolean(item.subtitle));

  if (!usable.length) {
    return "";
  }

  const byLang = (lang: string) =>
    usable.find((item) => (item.language ?? "").toLowerCase() === lang.toLowerCase());

  return byLang("id-id")?.subtitle ?? byLang("en-us")?.subtitle ?? usable[0]?.subtitle ?? "";
}

function toEpisodeSlug(dramaId: string, episodeId: string): string {
  return `${dramaId}_${episodeId}`;
}

function parseEpisodeSlug(slug: string): { dramaId: string; episodeId: string } {
  const splitAt = slug.lastIndexOf("_");

  if (splitAt <= 0 || splitAt >= slug.length - 1) {
    throw new Error("Invalid episode slug. Expected format: {dramaId}_{episodeId}");
  }

  return {
    dramaId: slug.slice(0, splitAt),
    episodeId: slug.slice(splitAt + 1)
  };
}

function mapDashboardItem(item: DramaWaveDashboardItem): CardItem {
  return {
    id: item.id ?? item.key ?? item.chapter_id ?? "",
    title: item.title ?? item.name ?? item.chapter_name ?? "Untitled",
    thumbnail: item.cover ?? item.first_frame ?? null
  };
}

function mapSearchItem(item: DramaWaveSearchItem): CardItem {
  return {
    id: item.id ?? "",
    title: item.title ?? item.name ?? "Untitled",
    thumbnail: item.cover ?? null
  };
}

function normalizeDashboardItems(payload: DramaWaveDashboardResponse): DramaWaveDashboardItem[] {
  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload.data && typeof payload.data === "object") {
    const boxed = payload.data as {
      items?: Array<DramaWaveDashboardItem | { items?: DramaWaveDashboardItem[] }>;
      list?: DramaWaveDashboardItem[];
    };
    if (Array.isArray(boxed.items)) {
      const flattened = boxed.items.flatMap((entry) => {
        if (entry && typeof entry === "object" && "items" in entry && Array.isArray(entry.items)) {
          return entry.items;
        }
        return entry as DramaWaveDashboardItem;
      });

      return flattened.filter(Boolean);
    }
    if (Array.isArray(boxed.list)) {
      return boxed.list;
    }
  }

  return [];
}

function normalizeSearchItems(payload: DramaWaveSearchResponse): DramaWaveSearchItem[] {
  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload.data && typeof payload.data === "object") {
    const boxed = payload.data as { items?: DramaWaveSearchItem[]; list?: DramaWaveSearchItem[] };
    if (Array.isArray(boxed.items)) {
      return boxed.items;
    }
    if (Array.isArray(boxed.list)) {
      return boxed.list;
    }
  }

  return [];
}

async function fetchDetail(dramaId: string): Promise<DramaWaveDetailResponse> {
  const params = new URLSearchParams({ lang: "id-ID" });

  return upstreamGet<DramaWaveDetailResponse>(
    `${getBaseUrl()}/dramas/${encodeURIComponent(dramaId)}?${params.toString()}`,
    requireToken()
  );
}

export class DramaWaveProvider implements ProductProvider {
  async dashboard() {
    const params = new URLSearchParams({ page: "1", lang: "id-ID" });
    const payload = await upstreamGet<DramaWaveDashboardResponse>(
      `${getBaseUrl()}/feed/popular?${params.toString()}`,
      requireToken()
    );

    const items = normalizeDashboardItems(payload).map(mapDashboardItem).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async search(keyword: string) {
    const params = new URLSearchParams({ lang: "id-ID", q: keyword });
    const payload = await upstreamGet<DramaWaveSearchResponse>(
      `${getBaseUrl()}/search?${params.toString()}`,
      requireToken()
    );

    const items = normalizeSearchItems(payload).map(mapSearchItem).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async detail(dramaId: string): Promise<DramaDetail> {
    const payload = await fetchDetail(dramaId);
    const info = payload.data?.info ?? {};
    const episodes = (info.episode_list ?? [])
      .filter((item) => Boolean(item.id) && Number.isInteger(item.index))
      .map((item) => ({
        id: toEpisodeSlug(dramaId, item.id as string),
        number: item.index as number,
        url: pickVideoUrl(item)
      }));

    return {
      id: info.id ?? dramaId,
      title: info.name ?? "Untitled",
      thumbnail: info.cover ?? null,
      synopsis: info.desc ?? null,
      totalEpisodes: info.episode_count ?? episodes.length,
      episodes
    };
  }

  async episodes(dramaId: string) {
    const detail = await this.detail(dramaId);

    return {
      dramaId,
      items: detail.episodes,
      total: detail.episodes.length
    };
  }

  async episode(slug: string): Promise<EpisodeDetail> {
    const { dramaId, episodeId } = parseEpisodeSlug(slug);
    const payload = await fetchDetail(dramaId);
    const match = (payload.data?.info?.episode_list ?? []).find((item) => item.id === episodeId);

    return {
      id: slug,
      title: match?.name ?? `Episode ${match?.index ?? ""}`.trim(),
      url: pickVideoUrl(match),
      subtitle: pickSubtitle(match?.subtitle_list ?? [])
    };
  }
}
