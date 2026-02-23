import { upstreamGet } from "@/lib/upstream";
import type { CardItem, DramaDetail, EpisodeDetail, ProductProvider } from "@/lib/providers/types";

type SnackShortBookCard = {
  book_id?: number;
  title?: string;
  image?: string;
  bannerImage?: string;
  cover_key?: string;
};

type SnackShortHomeModule = {
  book_data?: SnackShortBookCard[];
};

type SnackShortHomeResponse = {
  data?: {
    code?: number;
    msg?: string;
    data?: SnackShortHomeModule[];
  };
};

type SnackShortSearchResponse = {
  data?: {
    code?: number;
    msg?: string;
    data?: {
      total?: number;
      data?: SnackShortBookCard[];
    };
  };
};

type SnackShortBookResponse = {
  data?: {
    code?: number;
    msg?: string;
    data?: {
      book?: {
        book_id?: number;
        chapters?: number;
        book_name?: string;
        introduce?: string;
        image?: string;
        cover_key?: string;
      };
      chapter?: {
        chapter_id?: number;
        chapter_order?: number;
        chapter_name?: string;
      };
      play_url?: string;
    };
  };
};

type SnackShortChapterItem = {
  chapter_id?: number;
  chapter_order?: number;
  chapter_name?: string;
};

type SnackShortChaptersResponse = {
  data?: {
    code?: number;
    msg?: string;
    data?: SnackShortChapterItem[];
  };
};

type SnackShortEpisodeResponse = {
  data?: {
    code?: number;
    success?: boolean;
    data?: {
      playUrl?: string;
      chapter?: {
        chapter_id?: number;
        chapter_order?: number;
        chapter_name?: string;
      };
    };
  };
};

const DEFAULT_BASE_URL = "https://captain.sapimu.au/snackshort/api/v1";

function requireToken(): string {
  const token = process.env.PARENT_API_TOKEN;

  if (!token) {
    throw new Error("PARENT_API_TOKEN is not set");
  }

  return token;
}

function getBaseUrl(): string {
  const configured = process.env.SNACKSHORT_API_BASE_URL;

  if (!configured) {
    return DEFAULT_BASE_URL;
  }

  return configured.replace(/\/+$/, "");
}

function toCard(item: SnackShortBookCard): CardItem {
  const bookId = item.book_id;

  return {
    id: bookId ? String(bookId) : "",
    title: item.title ?? "Untitled",
    thumbnail: item.cover_key ?? item.image ?? item.bannerImage ?? null
  };
}

function toEpisodeSlug(bookId: string, chapterId: number): string {
  return `${bookId}_${chapterId}`;
}

function parseEpisodeSlug(value: string): { bookId: string; chapterId: number } {
  const splitAt = value.lastIndexOf("_");

  if (splitAt <= 0 || splitAt >= value.length - 1) {
    throw new Error("Invalid episode slug. Expected format: {bookId}_{chapterId}");
  }

  const bookId = value.slice(0, splitAt);
  const chapterRaw = value.slice(splitAt + 1);
  const chapterId = Number.parseInt(chapterRaw, 10);

  if (!Number.isInteger(chapterId) || chapterId <= 0) {
    throw new Error("Invalid episode slug. Chapter id must be a positive integer");
  }

  return { bookId, chapterId };
}

async function fetchBook(bookId: string): Promise<SnackShortBookResponse> {
  const params = new URLSearchParams({ lang: "Indonesian" });

  return upstreamGet<SnackShortBookResponse>(
    `${getBaseUrl()}/book/${encodeURIComponent(bookId)}?${params.toString()}`,
    requireToken()
  );
}

async function fetchChapters(bookId: string): Promise<SnackShortChapterItem[]> {
  const params = new URLSearchParams({ lang: "Indonesian" });
  const payload = await upstreamGet<SnackShortChaptersResponse>(
    `${getBaseUrl()}/book/${encodeURIComponent(bookId)}/chapters?${params.toString()}`,
    requireToken()
  );

  return payload.data?.data ?? [];
}

export class SnackShortProvider implements ProductProvider {
  async dashboard() {
    const params = new URLSearchParams({ lang: "Indonesian" });
    const payload = await upstreamGet<SnackShortHomeResponse>(
      `${getBaseUrl()}/home?${params.toString()}`,
      requireToken()
    );

    const firstModule = payload.data?.data?.[0];
    const items = (firstModule?.book_data ?? []).map(toCard).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async search(keyword: string) {
    const params = new URLSearchParams({
      q: keyword,
      page: "1",
      limit: "50",
      lang: "Indonesian"
    });

    const payload = await upstreamGet<SnackShortSearchResponse>(
      `${getBaseUrl()}/search?${params.toString()}`,
      requireToken()
    );

    const items = (payload.data?.data?.data ?? []).map(toCard).filter((item) => item.id.length > 0);

    return {
      items,
      total: items.length
    };
  }

  async detail(dramaId: string): Promise<DramaDetail> {
    const [bookPayload, chapters] = await Promise.all([fetchBook(dramaId), fetchChapters(dramaId)]);

    const book = bookPayload.data?.data?.book ?? {};
    const firstChapter = bookPayload.data?.data?.chapter;
    const firstPlayUrl = bookPayload.data?.data?.play_url ?? "";

    const episodes = chapters
      .filter((chapter) => Number.isInteger(chapter.chapter_id) && Number.isInteger(chapter.chapter_order))
      .map((chapter) => {
        const chapterId = chapter.chapter_id as number;
        const chapterOrder = chapter.chapter_order as number;
        const isFirst = firstChapter?.chapter_id === chapterId;

        return {
          id: toEpisodeSlug(dramaId, chapterId),
          number: chapterOrder,
          url: isFirst ? firstPlayUrl : ""
        };
      });

    return {
      id: dramaId,
      title: book.book_name ?? "Untitled",
      thumbnail: book.image ?? book.cover_key ?? null,
      synopsis: book.introduce ?? null,
      totalEpisodes: book.chapters ?? episodes.length,
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
    const { bookId, chapterId } = parseEpisodeSlug(slug);
    const params = new URLSearchParams({ lang: "Indonesian" });

    const payload = await upstreamGet<SnackShortEpisodeResponse>(
      `${getBaseUrl()}/book/${encodeURIComponent(bookId)}/episode/${chapterId}?${params.toString()}`,
      requireToken()
    );

    const episodeData = payload.data?.data;
    const chapter = episodeData?.chapter;
    const fallbackTitle = chapter?.chapter_order ? `EP.${chapter.chapter_order}` : "Episode";

    return {
      id: slug,
      title: chapter?.chapter_name ?? fallbackTitle,
      url: episodeData?.playUrl ?? "",
      subtitle: ""
    };
  }
}
