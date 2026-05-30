import { tool } from "ai";
import { z } from "zod";

const FORTUNES = [
  "A rooftop table with your name on it appears within seven days.",
  "Someone you haven't texted in a while is thinking about plans — be the one who asks.",
  "Your next great meal involves something you said you'd never try. Order it anyway.",
  "Luck favors the friend who sends the calendar invite first.",
  "A small risk tonight leads to a story you'll retell for years.",
  "The universe recommends saying yes to the thing that starts after 9pm.",
  "Your vibe attracts a reservation you didn't know you needed.",
  "Stop overthinking the outfit — confidence is the accessory.",
  "An unexpected DM holds the key to this week's best hangout.",
  "Fortune says: hydrate, then go out.",
];

export const fortuneCookie = tool({
  description: "Crack a virtual fortune cookie — fun hackathon stub.",
  inputSchema: z.object({
    topic: z.string().optional().describe("Optional topic to flavor the fortune, e.g. 'love' or 'career'"),
  }),
  execute: async ({ topic }) => {
    const base = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]!;
    const fortune = topic
      ? `${base} (re: ${topic})`
      : base;
    console.log(`[agent] tool:done fortuneCookie`);
    return `🥠 ${fortune}\n\n— your doze-test fortune cookie`;
  },
});
