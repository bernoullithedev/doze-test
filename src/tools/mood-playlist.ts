import { tool } from "ai";
import { z } from "zod";

const PLAYLISTS: Record<string, { name: string; tracks: string[] }> = {
  chill: {
    name: "Accra Sunset Chill",
    tracks: ["Burna Boy — Last Last", "Ayra Starr — Rush", "Khruangbin — Time (You and I)", "SZA — Snooze"],
  },
  hype: {
    name: "Pre-Game Hype",
    tracks: ["Rema — Calm Down", "Fireboy DML — Peru", "Drake — Nonstop", "Wizkid — Essence"],
  },
  sad: {
    name: "Soft Hours",
    tracks: ["Frank Ocean — Pink + White", "Tems — Free Mind", "Bon Iver — Holocene", "SZA — Good Days"],
  },
  focus: {
    name: "Deep Work Flow",
    tracks: ["Tycho — Awake", "Nujabes — Aruarian Dance", "KAYTRANADA — Lite Spots", "Fred again.. — Delilah"],
  },
  romantic: {
    name: "Date Night Glow",
    tracks: ["Daniel Caesar — Best Part", "Omah Lay — Soso", "H.E.R. — Focus", "John Legend — Ordinary People"],
  },
  party: {
    name: "Outdoze Night Out",
    tracks: ["Uncle Waffles — Tanzania", "Asake — Terminator", "Beyoncé — Break My Soul", "Major Lazer — Light It Up"],
  },
};

function normalizeMood(mood: string): string {
  const m = mood.toLowerCase();
  if (/sad|melanch|blue|down/.test(m)) return "sad";
  if (/hype|party|turn up|lit|club/.test(m)) return "party";
  if (/focus|work|study|grind/.test(m)) return "focus";
  if (/love|romantic|date|cozy/.test(m)) return "romantic";
  if (/energy|hype|pump/.test(m)) return "hype";
  return "chill";
}

export const moodPlaylist = tool({
  description: "Generate a stub playlist recommendation for a mood or vibe.",
  inputSchema: z.object({
    mood: z.string().describe("Mood or vibe, e.g. 'chill sunset', 'pre-game hype', 'sad boi hours'"),
  }),
  execute: async ({ mood }) => {
    const key = normalizeMood(mood);
    const playlist = PLAYLISTS[key] ?? PLAYLISTS.chill!;
    console.log(`[agent] tool:done moodPlaylist ${key}`);
    return [
      `🎧 ${playlist.name} (stub playlist for "${mood}")`,
      "",
      ...playlist.tracks.map((t, i) => `${i + 1}. ${t}`),
      "",
      "Spotify/Apple Music link coming soon — this is a hackathon stub.",
    ].join("\n");
  },
});
