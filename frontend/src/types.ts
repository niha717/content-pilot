export type MediaType = "ARTICLE" | "VIDEO" | "AUDIO";
export interface Source {
  platform: string;
  sourceId: string | null;
  author: string;
  originalUrl: string | null;
  rankingUrl: string;
  rankingScope: string;
  rank: number;
  publishedAt: string;
  fetchedAt: string;
  coverage: string;
  verification: string;
  metrics: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    favorites: number | null;
    shares: number | null;
    coins: number | null;
    danmaku: number | null;
  };
  limitation: string;
}
export interface Match {
  id: string;
  title: string;
  mediaType: MediaType;
  similarity: number;
  heat: number;
  impressions: number | null;
  ctr: number | null;
  engagementRate: number | null;
  completionRate: number | null;
  demo: boolean;
  source: Source | null;
}
export interface Report {
  mode: string;
  retrievalMode: string;
  summary: string;
  score: number;
  confidence: string;
  matches: Match[];
  evidence: string[];
  improvements: string[];
  audiences: string[];
  stages: { name: string; budget: number; rule: string }[];
  targetCtr: number;
  targetEngagement: number;
  targetCompletion: number;
  decision: string;
  decisionReason: string;
  aiAdvice: string | null;
  generatedAt: string;
}
export interface Content {
  id: string;
  title: string;
  mediaType: MediaType;
  category: string;
  audience: string;
  tags: string;
  body: string;
  historical: boolean;
  demo: boolean;
  impressions: number;
  clicks: number;
  engagements: number;
  completions: number;
  status: string;
  fileName: string | null;
  mimeType: string | null;
  error: string | null;
  report: Report | null;
  createdAt: string;
  source: Source | null;
}
export interface Draft {
  title: string;
  mediaType: MediaType;
  category: string;
  audience: string;
  tags: string;
  body: string;
  historical: boolean;
  impressions: number;
  clicks: number;
  engagements: number;
  completions: number;
}
