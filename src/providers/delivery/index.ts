export interface Digest {
  items: {
    title: string;
    url: string;
    summary: string | null;
    category: string;
    source: string;
    score: number;
  }[];
  metadata: {
    total_new_items: number;
    total_selected: number;
    date: string;
  };
}

export interface DeliveryProvider {
  send(digest: Digest): Promise<void>;
}
