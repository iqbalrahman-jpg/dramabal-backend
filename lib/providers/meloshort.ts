import { upstreamGet } from "@/lib/upstream";
import type { CardItem, DramaDetail, EpisodeDetail, ProductProvider } from "@/lib/providers/types";

type MeloShortTopItem = {
  drama_id?: string;
  drama_title?: string;
  drama_cover?: string;
};

type MeloShortTopResponse = {
  code?: number;
  msg?: string;
  data?: {
    list?: MeloShortTopItem[];
  };
};

type MeloShortSearchItem = {
  dramaId?: string;
  title?: string;
  cover?: string;
};

type MeloShortSearchResponse = {
  code?: number;
  msg?: string;
  data?: MeloShortSearchItem[];
};

type MeloShortEpisodeListItem = {
  chapter_id?: string;
  chapter_index?: number;
  chapter_name?: string;
};

type MeloShortEpisodeListResponse = {
  code?: number;
  msg?: string;
  data?: MeloShortEpisodeListItem[];
};

type MeloShortSubtitleItem = {
  language?: string;
  url?: string;
};

type MeloShortEpisodeDetailResponse = {
  code?: number;
  msg?: string;
  data?: {
    chapter_id?: string;
    chapter_index?: number;
    chapter_name?: string;
    chapters?: number;
    drama_id?: string;
    drama_title?: string;
    drama_cover?: string;
    drama_description?: string;
    play_url?: string;
    sublist?: MeloShortSubtitleItem[];
  };
};

const DEFAULT_BASE_URL = "https://captain.sapimu.au/meloshort/api/v1";

function requireToken(): string {
  const token = process.env.PARENT_API_TOKEN;

  if (!token) {
    throw new Error("PARENT_API_TOKEN is not set");
  }

  return token;
}

function getBaseUrl(): string {
  const configured = process.env.MELOSHORT_API_BASE_URL;

  if (!configured) {
    return DEFAULT_BASE_URL;
  }

  return configured.replace(/\/+$/, "");
}

function mapCard(item: MeloShortTopItem | MeloShortSearchItem): CardItem {
  const id = "drama_id" in item ? item.drama_id : "dramaId" in item ? item.dramaId : undefined;
  const title = "drama_title" in item ? item.drama_title : "title" in item ? item.title : undefined;
  const cover = "drama_cover" in item ? item.drama_cover : "cover" in item ? item.cover : undefined;

  return {
    id: id ?? "",
    title: title ?? "Untitled",
    thumbnail: cover ?? null
  };
}

function pickSubtitle(subtitles: MeloShortSubtitleItem[] = []): string {
  const usable = subtitles.filter((item) => Boolean(item.url));

  if (!usable.length) {
    return "";
  }

  const byLang = (lang: string) =>
    usable.find((item) => (item.language ?? "").toLowerCase().includes(lang));

  return byLang("ind")?.url ?? byLang("en")?.url ?? usable[0]?.url ?? "";
}

function toEpisodeSlug(dramaId: string, chapterId: string): string {
  return `${dramaId}_${chapterId}`;
}

function parseEpisodeSlug(slug: string): { dramaId: string; chapterId: string } {
  const splitAt = slug.lastIndexOf("_");

  if (splitAt <= 0 || splitAt >= slug.length - 1) {
    throw new Error("Invalid episode slug. Expected format: {dramaId}_{chapterId}");
  }

  return {
    dramaId: slug.slice(0, splitAt),
    chapterId: slug.slice(splitAt + 1)
  };
}

async function fetchEpisodeList(dramaId: string): Promise<MeloShortEpisodeListItem[]> {
  const payload = await upstreamGet<MeloShortEpisodeListResponse>(
    `${getBaseUrl()}/dramas/${encodeURIComponent(dramaId)}/episodes`,
    requireToken()
  );

  return payload.data ?? [];
}

export class MeloShortProvider implements ProductProvider {
  async dashboard() {
    const payload = await upstreamGet<MeloShortTopResponse>(`${getBaseUrl()}/dramas/top`, requireToken());
    const items = (payload.data?.list ?? []).map(mapCard).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async search(keyword: string) {
    const params = new URLSearchParams({ q: keyword });
    const payload = await upstreamGet<MeloShortSearchResponse>(
      `${getBaseUrl()}/dramas/search?${params.toString()}`,
      requireToken()
    );

    const items = (payload.data ?? []).map(mapCard).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async detail(dramaId: string): Promise<DramaDetail> {
    const episodesRaw = await fetchEpisodeList(dramaId);

    const episodes = episodesRaw
      .filter((item) => Boolean(item.chapter_id) && Number.isInteger(item.chapter_index))
      .map((item) => ({
        id: toEpisodeSlug(dramaId, item.chapter_id as string),
        number: item.chapter_index as number,
        url: ""
      }));

    let title = "Untitled";
    let thumbnail: string | null = null;
    let synopsis: string | null = null;
    let totalEpisodes = episodes.length;

    const firstChapterId = episodesRaw.find((item) => Boolean(item.chapter_id))?.chapter_id;

    if (firstChapterId) {
      const firstDetail = await upstreamGet<MeloShortEpisodeDetailResponse>(
        `${getBaseUrl()}/dramas/${encodeURIComponent(dramaId)}/episodes/${encodeURIComponent(firstChapterId)}`,
        requireToken()
      );

      const data = firstDetail.data ?? {};
      title = data.drama_title ?? title;
      thumbnail = data.drama_cover ?? thumbnail;
      synopsis = data.drama_description ?? synopsis;
      totalEpisodes = data.chapters ?? totalEpisodes;
    }

    return {
      id: dramaId,
      title,
      thumbnail,
      synopsis,
      totalEpisodes,
      episodes
    };
  }

  async episodes(dramaId: string) {
    const episodesRaw = await fetchEpisodeList(dramaId);

    const items = episodesRaw
      .filter((item) => Boolean(item.chapter_id) && Number.isInteger(item.chapter_index))
      .map((item) => ({
        id: toEpisodeSlug(dramaId, item.chapter_id as string),
        number: item.chapter_index as number,
        url: ""
      }));

    return {
      dramaId,
      items,
      total: items.length
    };
  }

  async episode(slug: string): Promise<EpisodeDetail> {
    const { dramaId, chapterId } = parseEpisodeSlug(slug);

    const payload = await upstreamGet<MeloShortEpisodeDetailResponse>(
      `${getBaseUrl()}/dramas/${encodeURIComponent(dramaId)}/episodes/${encodeURIComponent(chapterId)}`,
      requireToken()
    );

    const data = payload.data ?? {};

    return {
      id: slug,
      title: data.chapter_name ?? `Episode ${data.chapter_index ?? ""}`.trim(),
      url: data.play_url ?? "",
      subtitle: pickSubtitle(data.sublist ?? [])
    };
  }
}
