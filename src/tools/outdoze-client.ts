const DEFAULT_BASE_URL = "https://staging.example";

function getBaseUrl(): string {
  const base = process.env.OUTDOZE_API_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    return DEFAULT_BASE_URL;
  }
  return base;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const apiKey = process.env.OUTDOZE_API_KEY;
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

async function fetchJson<T>(path: string): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!process.env.OUTDOZE_API_BASE_URL) {
    throw new Error(
      "OUTDOZE_API_BASE_URL is not configured. Set it to the Outdoze staging host (no trailing slash)."
    );
  }

  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Outdoze API ${response.status} ${path}: ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

export interface OutdozeSearchParams {
  q?: string;
  city?: string;
  category?: string;
  cursor?: number;
  pageSize?: number;
}

export interface OutdozeSearchResult {
  data: Array<{
    id: string;
    slug: string;
    name: string;
    city: string;
    area: string;
    category: string;
    rating: number;
    priceLevel: number;
    tags: string[];
    shortDescription: string;
    phone?: string;
  }>;
  nextCursor?: number;
  pageSize: number;
  currentPage: number;
}

export interface OutdozePlaceDetail {
  place: {
    id: string;
    slug: string;
    name: string;
    city: string;
    area: string;
    category: string;
    rating: number;
    reviewCount: number;
    priceLevel: number;
    tags: string[];
    hours?: string;
    address?: string;
    phone: string;
    website?: string;
  };
}

export interface OutdozeCheckoutOptions {
  placeSlug: string;
  currency: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
    priceCents: number;
    depositCents: number;
  }>;
  policies: {
    cancellation: string;
    paymentMethods: string[];
  };
  deepLink: string;
  bookingPhone: string;
}

export async function searchPlaces(params: OutdozeSearchParams): Promise<OutdozeSearchResult> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.city) searchParams.set("city", params.city);
  if (params.category) searchParams.set("category", params.category);
  searchParams.set("cursor", String(params.cursor ?? 0));
  searchParams.set("pageSize", String(params.pageSize ?? 10));

  return fetchJson<OutdozeSearchResult>(`/api/places/search?${searchParams.toString()}`);
}

export async function getPlaceDetail(slug: string): Promise<OutdozePlaceDetail> {
  return fetchJson<OutdozePlaceDetail>(`/api/places/${encodeURIComponent(slug)}`);
}

export async function getCheckoutOptions(slug: string): Promise<OutdozeCheckoutOptions> {
  return fetchJson<OutdozeCheckoutOptions>(
    `/api/places/${encodeURIComponent(slug)}/checkout-options`
  );
}
