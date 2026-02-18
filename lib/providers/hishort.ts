import { upstreamGet } from "@/lib/upstream";
import type { CardItem, DramaDetail, EpisodeDetail, ProductProvider } from "@/lib/providers/types";

type HiShortCard = {
  slug?: string;
  title?: string;
  poster?: string;
};

type HiShortHomeResponse = {
  status?: number;
  data?: {
    popular?: HiShortCard[];
  };
};

type HiShortSearchResponse = {
  status?: number;
  data?: HiShortCard[];
};

type HiShortDramaEpisode = {
  slug?: string;
  number?: number;
};

type HiShortDramaResponse = {
  status?: number;
  data?: {
    title?: string;
    poster?: string;
    synopsis?: string;
    totalEpisodes?: number;
    episodes?: HiShortDramaEpisode[];
  };
};

type HiShortEpisodeServer = {
  name?: string;
  url?: string;
  type?: string;
};

type HiShortEpisodeResponse = {
  status?: number;
  data?: {
    title?: string;
    servers?: HiShortEpisodeServer[];
  };
};

function mapCard(item: HiShortCard): CardItem {
  return {
    id: item.slug ?? "",
    title: item.title ?? "Untitled",
    thumbnail: item.poster ?? null
  };
}

function sanitizeCards(items: HiShortCard[] = []): CardItem[] {
  return items
    .map(mapCard)
    .filter((item) => item.id.length > 0);
}

function requireToken(): string {
  const token = process.env.PARENT_API_TOKEN;

  if (!token) {
    throw new Error("PARENT_API_TOKEN is not set");
  }

  return token;
}

function getBaseUrl(): string {
  const configured = process.env.HISHORT_API_BASE_URL;

  if (!configured) {
    return "https://captain.sapimu.au/hishort/api/v1";
  }

  return configured.replace(/\/+$/, "");
}

export class HiShortProvider implements ProductProvider {
  async dashboard() {
    const payload = await upstreamGet<HiShortHomeResponse>(`${getBaseUrl()}/home`, requireToken());
    const items = sanitizeCards(payload.data?.popular ?? []);

    return {
      items,
      total: items.length
    };
  }

  async search(keyword: string) {
    const encodedKeyword = encodeURIComponent(keyword.trim());
    const payload = await upstreamGet<HiShortSearchResponse>(
      `${getBaseUrl()}/search/${encodedKeyword}`,
      requireToken()
    );

    const items = sanitizeCards(payload.data ?? []);

    return {
      items,
      total: items.length
    };
  }

  async detail(dramaId: string): Promise<DramaDetail> {
    const payload = await upstreamGet<HiShortDramaResponse>(
      `${getBaseUrl()}/drama/${encodeURIComponent(dramaId)}`,
      requireToken()
    );

    const data = payload.data ?? {};
    const episodes = (data.episodes ?? [])
      .filter((item) => Boolean(item.slug))
      .map((item) => ({
        id: item.slug as string,
        number: item.number ?? 0,
        url: ""
      }));

    return {
      id: dramaId,
      title: data.title ?? "Untitled",
      thumbnail: data.poster ?? null,
      synopsis: data.synopsis ?? null,
      totalEpisodes: data.totalEpisodes ?? episodes.length,
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
    const payload = await upstreamGet<HiShortEpisodeResponse>(
      `${getBaseUrl()}/episode/${encodeURIComponent(slug)}`,
      requireToken()
    );

    const data = payload.data ?? {};
    const firstServer = (data.servers ?? []).find((server) => Boolean(server.url));

    return {
      id: slug,
      title: data.title ?? "Untitled Episode",
      url: firstServer?.url ?? ""
    };
  }
}
