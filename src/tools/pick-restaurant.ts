import { tool } from "ai";
import { z } from "zod";

interface CuratedRestaurant {
  name: string;
  area: string;
  cuisine: string;
  vibe: string;
  priceLevel: 1 | 2 | 3;
  tags: string[];
}

const CURATED: CuratedRestaurant[] = [
  { name: "Afrikiko", area: "Airport City", cuisine: "Ghanaian fusion", vibe: "lively", priceLevel: 2, tags: ["live music", "groups"] },
  { name: "Santoku", area: "Villagio", cuisine: "Japanese", vibe: "upscale", priceLevel: 3, tags: ["date night", "sushi"] },
  { name: "Kōzo Restaurant", area: "Osu", cuisine: "Asian fusion", vibe: "trendy", priceLevel: 2, tags: ["cocktails", "date night"] },
  { name: "Azmera Restaurant", area: "Labone", cuisine: "Ethiopian", vibe: "cozy", priceLevel: 2, tags: ["vegetarian-friendly", "intimate"] },
  { name: "Buka Restaurant", area: "Osu", cuisine: "West African", vibe: "casual", priceLevel: 1, tags: ["local", "budget"] },
  { name: "Skybar25", area: "Airport City", cuisine: "International", vibe: "rooftop", priceLevel: 3, tags: ["views", "sunset"] },
  { name: "Polo Beach Club", area: "Labadi", cuisine: "Seafood", vibe: "beach", priceLevel: 2, tags: ["outdoor", "weekend"] },
  { name: "Chop Bar Express", area: "East Legon", cuisine: "Ghanaian", vibe: "quick", priceLevel: 1, tags: ["casual", "local"] },
  { name: "Coco Lounge", area: "Airport Residential", cuisine: "Mediterranean", vibe: "chill", priceLevel: 2, tags: ["lounge", "small groups"] },
  { name: "Dimaensa Lounge", area: "East Legon", cuisine: "Continental", vibe: "upscale lounge", priceLevel: 3, tags: ["rooftop", "date night"] },
];

function rollDice(): number {
  return Math.floor(Math.random() * CURATED.length);
}

function filterRestaurants(filters: {
  cuisine?: string;
  vibe?: string;
  area?: string;
  maxPriceLevel?: number;
  tags?: string[];
}): CuratedRestaurant[] {
  return CURATED.filter((r) => {
    if (filters.cuisine && !r.cuisine.toLowerCase().includes(filters.cuisine.toLowerCase())) {
      return false;
    }
    if (filters.vibe && !r.vibe.toLowerCase().includes(filters.vibe.toLowerCase())) {
      return false;
    }
    if (filters.area && !r.area.toLowerCase().includes(filters.area.toLowerCase())) {
      return false;
    }
    if (filters.maxPriceLevel !== undefined && r.priceLevel > filters.maxPriceLevel) {
      return false;
    }
    if (filters.tags?.length) {
      const lowerTags = r.tags.map((t) => t.toLowerCase());
      if (!filters.tags.every((t) => lowerTags.some((lt) => lt.includes(t.toLowerCase())))) {
        return false;
      }
    }
    return true;
  });
}

function formatPick(r: CuratedRestaurant, reason: string): string {
  const price = "₵".repeat(r.priceLevel);
  return `${reason}\n\n🎲 ${r.name}\n${r.cuisine} · ${r.area} · ${r.vibe} vibe · ${price}\nTags: ${r.tags.join(", ")}\n\nWant me to look it up on Outdoze or search for hours?`;
}

export const pickRestaurant = tool({
  description:
    "Pick a restaurant when the group can't decide — curated Accra list with optional filters or pure dice roll.",
  inputSchema: z.object({
    mode: z.enum(["dice", "filter"]).optional().describe("dice = random surprise; filter = apply filters"),
    cuisine: z.string().optional().describe("e.g. Japanese, Ghanaian"),
    vibe: z.string().optional().describe("e.g. rooftop, cozy, beach"),
    area: z.string().optional().describe("e.g. Osu, East Legon"),
    maxPriceLevel: z.number().min(1).max(3).optional().describe("1=budget, 2=mid, 3=upscale"),
    tags: z.array(z.string()).optional().describe("e.g. date night, vegetarian-friendly"),
  }),
  execute: async ({ mode, cuisine, vibe, area, maxPriceLevel, tags }) => {
    const useFilter = mode === "filter" || cuisine || vibe || area || maxPriceLevel || tags?.length;

    if (useFilter) {
      const matches = filterRestaurants({ cuisine, vibe, area, maxPriceLevel, tags });
      if (matches.length === 0) {
        const fallback = CURATED[rollDice()]!;
        console.log(`[agent] tool:done pickRestaurant filter miss, dice fallback`);
        return formatPick(fallback, "Nothing matched those filters — rerolling the dice:");
      }
      const pick = matches[rollDice() % matches.length]!;
      console.log(`[agent] tool:done pickRestaurant filter (${matches.length} matches)`);
      return formatPick(pick, `Filtered ${matches.length} spot(s) — my pick:`);
    }

    const pick = CURATED[rollDice()]!;
    console.log(`[agent] tool:done pickRestaurant dice`);
    return formatPick(pick, "Alright, dice says:");
  },
});
