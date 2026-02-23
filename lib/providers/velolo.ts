import { upstreamGet } from "@/lib/upstream";
import type { CardItem, DramaDetail, EpisodeDetail, ProductProvider } from "@/lib/providers/types";

type VeloloListItem = {
  id?: string;
  name?: string;
  cover?: string;
  introduction?: string;
  episode?: number;
};

type VeloloListResponse = {
  total?: number;
  rows?: VeloloListItem[];
};

type VeloloDetailEpisode = {
  id?: string;
  videoId?: string;
  videoAddress?: string;
  orderNumber?: number;
  zimu?: string;
};

type VeloloDetailResponse = {
  videoInfo?: {
    id?: string;
    name?: string;
    cover?: string;
    introduction?: string;
    episode?: number;
  };
  episodesInfo?: {
    total?: number;
    rows?: VeloloDetailEpisode[];
    code?: number;
    msg?: string | null;
  };
};

const DEFAULT_BASE_URL = "https://captain.sapimu.au/velolo";
const FIXED_LIMIT = "10";

function requireToken(): string {
  const token = process.env.PARENT_API_TOKEN;

  if (!token) {
    throw new Error("PARENT_API_TOKEN is not set");
  }

  return token;
}

function getBaseUrl(): string {
  const configured = process.env.VELOLO_API_BASE_URL;

  if (!configured) {
    return DEFAULT_BASE_URL;
  }

  return configured.replace(/\/+$/, "");
}

function mapCard(item: VeloloListItem): CardItem {
  return {
    id: item.id ?? "",
    title: item.name ?? "Untitled",
    thumbnail: item.cover ?? null
  };
}

function toEpisodeSlug(dramaId: string, episodeId: string): string {
  return `${dramaId}_${episodeId}`;
}

function parseEpisodeSlug(value: string): { dramaId: string; episodeId: string } {
  const splitAt = value.lastIndexOf("_");

  if (splitAt <= 0 || splitAt >= value.length - 1) {
    throw new Error("Invalid episode slug. Expected format: {dramaId}_{episodeId}");
  }

  return {
    dramaId: value.slice(0, splitAt),
    episodeId: value.slice(splitAt + 1)
  };
}

async function fetchDetail(dramaId: string): Promise<VeloloDetailResponse> {
  const params = new URLSearchParams({ lang: "id" });

  return upstreamGet<VeloloDetailResponse>(
    `${getBaseUrl()}/detail/${encodeURIComponent(dramaId)}?${params.toString()}`,
    requireToken()
  );
}

export class VeloloProvider implements ProductProvider {
  async dashboard() {
    const params = new URLSearchParams({ page: "1", limit: FIXED_LIMIT, lang: "id" });
    const payload = await upstreamGet<VeloloListResponse>(
      `${getBaseUrl()}/hot?${params.toString()}`,
      requireToken()
    );

    const items = (payload.rows ?? []).map(mapCard).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async search(keyword: string) {
    const params = new URLSearchParams({ q: keyword, page: "1", limit: FIXED_LIMIT, lang: "id" });
    const payload = await upstreamGet<VeloloListResponse>(
      `${getBaseUrl()}/dramas?${params.toString()}`,
      requireToken()
    );

    const items = (payload.rows ?? []).map(mapCard).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async detail(dramaId: string): Promise<DramaDetail> {
    const payload = await fetchDetail(dramaId);
    const info = payload.videoInfo ?? {};
    const rows = payload.episodesInfo?.rows ?? [];

    const episodes = rows
      .filter((row) => Boolean(row.id))
      .map((row, index) => ({
        id: toEpisodeSlug(dramaId, row.id as string),
        number: (typeof row.orderNumber === "number" ? row.orderNumber : index) + 1,
        url: row.videoAddress ?? ""
      }));

    return {
      id: info.id ?? dramaId,
      title: info.name ?? "Untitled",
      thumbnail: info.cover ?? null,
      synopsis: info.introduction ?? null,
      totalEpisodes: info.episode ?? payload.episodesInfo?.total ?? episodes.length,
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
    const { dramaId, episodeId } = parseEpisodeSlug(slug);
    const payload = await fetchDetail(dramaId);
    const rows = payload.episodesInfo?.rows ?? [];
    const index = rows.findIndex((row) => row.id === episodeId);
    const row = index >= 0 ? rows[index] : undefined;

    return {
      id: slug,
      title: `Episode ${index >= 0 ? index + 1 : ""}`.trim(),
      url: row?.videoAddress ?? "",
      subtitle: row?.zimu ?? ""
    };
  }
}
