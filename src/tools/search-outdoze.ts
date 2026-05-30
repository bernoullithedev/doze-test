import { tool } from "ai";
import { z } from "zod";
import { searchPlaces, getPlaceDetail, getCheckoutOptions } from "./outdoze-client.js";

export const searchOutdoze = tool({
  description:
    "Search Outdoze staging for venues (restaurants, lounges, etc.), get place details by slug, or fetch checkout/booking options including bookingPhone. Use this before makePhoneCall for reservations.",
  inputSchema: z.object({
    action: z
      .enum(["search", "detail", "checkout_options"])
      .describe("search = list places; detail = full place info; checkout_options = booking slots + phone"),
    q: z.string().optional().describe("Search query, e.g. 'rooftop lounge Accra'"),
    city: z.string().optional().describe("City slug, e.g. 'accra'"),
    category: z.string().optional().describe("Category filter, e.g. 'restaurants' or 'lounges'"),
    slug: z.string().optional().describe("Place slug for detail or checkout_options"),
    pageSize: z.number().optional().describe("Results per page for search (default 10)"),
  }),
  execute: async ({ action, q, city, category, slug, pageSize }) => {
    try {
      if (action === "search") {
        const result = await searchPlaces({ q, city, category, pageSize: pageSize ?? 10 });
        if (result.data.length === 0) {
          return "No places found. Try different keywords or use searchProducts as fallback.";
        }
        const lines = result.data.map(
          (p) =>
            `- ${p.name} (${p.slug}) — ${p.area}, ${p.city} · ★${p.rating} · ${p.shortDescription}${p.phone ? ` · 📞 ${p.phone}` : ""}`
        );
        console.log(`[agent] tool:done searchOutdoze search (${result.data.length} results)`);
        return `Found ${result.data.length} place(s):\n${lines.join("\n")}`;
      }

      if (!slug) {
        return "slug is required for detail and checkout_options actions.";
      }

      if (action === "detail") {
        const { place } = await getPlaceDetail(slug);
        console.log(`[agent] tool:done searchOutdoze detail ${slug}`);
        return [
          `${place.name} (${place.slug})`,
          `${place.area}, ${place.city} · ${place.category}`,
          `★${place.rating} (${place.reviewCount} reviews) · price level ${place.priceLevel}`,
          place.address ? `Address: ${place.address}` : "",
          place.hours ? `Hours: ${place.hours}` : "",
          place.phone ? `Phone: ${place.phone}` : "",
          place.tags.length ? `Tags: ${place.tags.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }

      const checkout = await getCheckoutOptions(slug);
      console.log(`[agent] tool:done searchOutdoze checkout_options ${slug}`);
      const optionLines = checkout.options.map(
        (o) =>
          `- ${o.label}: ${o.description} — ₵${(o.priceCents / 100).toFixed(0)} (deposit ₵${(o.depositCents / 100).toFixed(0)})`
      );
      return [
        `Checkout options for ${checkout.placeSlug}:`,
        ...optionLines,
        `Booking phone: ${checkout.bookingPhone}`,
        `Policies: ${checkout.policies.cancellation}`,
        `Book: ${checkout.deepLink}`,
      ].join("\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[agent] tool:done searchOutdoze error: ${message}`);
      return `Outdoze lookup failed: ${message}. If staging is down, try searchProducts instead.`;
    }
  },
});
