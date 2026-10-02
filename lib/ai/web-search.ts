import "server-only";

/**
 * Kërkimi në web për asistentin.
 *
 * E njëjta formë si te faturimi dhe te emaili: një ndërfaqe, disa ofrues. Pa
 * çelës nuk kërkon askund dhe e thotë hapur; me `SEARCH_API_KEY` kalon te
 * ofruesi i vërtetë pa u prekur asnjë thirrje.
 *
 * Rri veçmas nga modeli me qëllim: një model që «kujton» ngjarje të sotme nuk
 * është burim, dhe studenti duhet ta shohë prej nga erdhi çdo fakt.
 */
export type WebResult = {
  title: string;
  url: string;
  snippet: string;
};

export type WebSearchProvider = {
  name: string;
  available: boolean;
  search: (query: string, limit: number) => Promise<WebResult[]>;
};

/** Pa çelës: nuk kërkon, dhe nuk shtiret se kërkoi. */
const noneProvider: WebSearchProvider = {
  name: "none",
  available: false,
  async search() {
    return [];
  },
};

/** Tavily: HTTP i thjeshtë, pa varësi të re, punon te funksionet pa server. */
const tavilyProvider: WebSearchProvider = {
  name: "tavily",
  available: true,
  async search(query, limit) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.SEARCH_API_KEY,
          query,
          max_results: Math.min(limit, 5),
          search_depth: "basic",
        }),
      });

      if (!response.ok) return [];

      const data = (await response.json()) as {
        results?: { title?: string; url?: string; content?: string }[];
      };

      return (data.results ?? [])
        .filter((item) => item.url)
        .slice(0, limit)
        .map((item) => ({
          title: item.title ?? item.url ?? "",
          url: item.url ?? "",
          snippet: (item.content ?? "").slice(0, 400),
        }));
    } catch {
      // Një kërkim i dështuar nuk e ndal përgjigjen: asistenti vazhdon pa të.
      return [];
    }
  },
};

export function getWebSearch(): WebSearchProvider {
  const chosen = (process.env.SEARCH_PROVIDER ?? "").toLowerCase();
  if (chosen === "none") return noneProvider;
  if (process.env.SEARCH_API_KEY) return tavilyProvider;
  return noneProvider;
}

export function webSearchAvailable() {
  return getWebSearch().available;
}
