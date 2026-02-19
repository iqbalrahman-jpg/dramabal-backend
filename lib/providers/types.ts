export type CardItem = {
  id: string;
  title: string;
  thumbnail: string | null;
};

export type DramaDetail = {
  id: string;
  title: string;
  thumbnail: string | null;
  synopsis: string | null;
  totalEpisodes: number;
  episodes: Array<{
    id: string;
    number: number;
    url: string;
  }>;
};

export type EpisodeDetail = {
  id: string;
  title: string;
  url: string;
  subtitle: string;
};

export interface ProductProvider {
  dashboard(): Promise<{ items: CardItem[]; total: number }>;
  search(keyword: string): Promise<{ items: CardItem[]; total: number }>;
  detail(dramaId: string): Promise<DramaDetail>;
  episodes(dramaId: string): Promise<{ dramaId: string; items: DramaDetail["episodes"]; total: number }>;
  episode(slug: string): Promise<EpisodeDetail>;
}
