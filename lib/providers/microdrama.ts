import { upstreamGet } from "@/lib/upstream";
import type { CardItem, DramaDetail, EpisodeDetail, ProductProvider } from "@/lib/providers/types";

type MicroDramaCard = {
  id?: string;
  title?: string;
  cover?: string;
};

type MicroDramaListResponse = {
  total?: number;
  dramas?: MicroDramaCard[];
};

type MicroDramaVideo = {
  quality?: string;
  url?: string;
  width?: number;
  height?: number;
};

type MicroDramaEpisode = {
  index?: number;
  videos?: MicroDramaVideo[];
};

type MicroDramaDetailResponse = {
  drama?: {
    id?: string;
    title?: string;
    description?: string;
    total_episodes?: number;
    cover?: string;
  };
  episodes?: MicroDramaEpisode[];
};

const DEFAULT_BASE_URL = "https://captain.sapimu.au/microdrama/api/v1";

function requireToken(): string {
  const token = process.env.PARENT_API_TOKEN;

  if (!token) {
    throw new Error("PARENT_API_TOKEN is not set");
  }

  return token;
}

function getBaseUrl(): string {
  const configured = process.env.MICRODRAMA_API_BASE_URL;

  if (!configured) {
    return DEFAULT_BASE_URL;
  }

  return configured.replace(/\/+$/, "");
}

function mapCard(item: MicroDramaCard): CardItem {
  return {
    id: item.id ?? "",
    title: item.title ?? "Untitled",
    thumbnail: item.cover ?? null
  };
}

function sanitizeCards(items: MicroDramaCard[] = []): CardItem[] {
  return items
    .map(mapCard)
    .filter((item) => item.id.length > 0);
}

function pickVideoUrl(videos: MicroDramaVideo[] = []): string {
  if (!videos.length) {
    return "";
  }

  const byQuality = [...videos].sort((a, b) => {
    const aScore = Number.parseInt((a.quality ?? "").replace(/\D/g, ""), 10) || 0;
    const bScore = Number.parseInt((b.quality ?? "").replace(/\D/g, ""), 10) || 0;

    return bScore - aScore;
  });

  return byQuality.find((item) => Boolean(item.url))?.url ?? "";
}

function toEpisodeId(dramaId: string, index: number): string {
  return `${dramaId}_${index}`;
}

function parseEpisodeSlug(slug: string): { dramaId: string; index: number } {
  const splitAt = slug.lastIndexOf("_");

  if (splitAt <= 0 || splitAt >= slug.length - 1) {
    throw new Error("Invalid episode slug. Expected format: {dramaId}_{episodeNumber}");
  }

  const dramaId = slug.slice(0, splitAt);
  const indexRaw = slug.slice(splitAt + 1);
  const index = Number.parseInt(indexRaw, 10);

  if (!Number.isInteger(index) || index <= 0) {
    throw new Error("Invalid episode slug. Episode number must be a positive integer");
  }

  return { dramaId, index };
}

export class MicroDramaProvider implements ProductProvider {
  async dashboard() {
    const params = new URLSearchParams({
      lang: "id",
      limit: "20"
    });

    const payload = await upstreamGet<MicroDramaListResponse>(
      `${getBaseUrl()}/dramas?${params.toString()}`,
      requireToken()
    );

    const items = sanitizeCards(payload.dramas ?? []);

    return {
      items,
      total: items.length
    };
  }

  async search(keyword: string) {
    const params = new URLSearchParams({
      q: keyword,
      lang: "id"
    });

    const payload = await upstreamGet<MicroDramaListResponse>(
      `${getBaseUrl()}/dramas/search?${params.toString()}`,
      requireToken()
    );

    const items = sanitizeCards(payload.dramas ?? []);

    return {
      items,
      total: items.length
    };
  }

  async detail(dramaId: string): Promise<DramaDetail> {
    const payload = await upstreamGet<MicroDramaDetailResponse>(
      `${getBaseUrl()}/dramas/${encodeURIComponent(dramaId)}`,
      requireToken()
    );

    const drama = payload.drama ?? {};
    const episodes = (payload.episodes ?? [])
      .filter((item) => Number.isInteger(item.index) && (item.index as number) > 0)
      .map((item) => ({
        id: toEpisodeId(dramaId, item.index as number),
        number: item.index as number,
        url: pickVideoUrl(item.videos ?? [])
      }));

    return {
      id: drama.id ?? dramaId,
      title: drama.title ?? "Untitled",
      thumbnail: drama.cover ?? null,
      synopsis: drama.description ?? null,
      totalEpisodes: drama.total_episodes ?? episodes.length,
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
    const { dramaId, index } = parseEpisodeSlug(slug);
    const payload = await upstreamGet<MicroDramaDetailResponse>(
      `${getBaseUrl()}/dramas/${encodeURIComponent(dramaId)}`,
      requireToken()
    );

    const match = (payload.episodes ?? []).find((item) => item.index === index);

    return {
      id: slug,
      title: `Episode ${index}`,
      url: pickVideoUrl(match?.videos ?? [])
    };
  }
}
