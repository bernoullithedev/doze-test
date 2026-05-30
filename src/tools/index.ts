import { saveMemory } from "./save-memory.js";
import { searchMemory } from "./search-memory.js";
import { manageList } from "./manage-list.js";
import { searchProducts } from "./search-products.js";
import { searchOutdoze } from "./search-outdoze.js";
import { makePhoneCall } from "./make-call.js";
import { generatePoster } from "./generate-poster.js";
import { pickRestaurant } from "./pick-restaurant.js";
import { fortuneCookie } from "./fortune-cookie.js";
import { moodPlaylist } from "./mood-playlist.js";
import { roastOutfit } from "./roast-outfit.js";

export const tools = {
  saveMemory,
  searchMemory,
  manageList,
  searchProducts,
  searchOutdoze,
  makePhoneCall,
  generatePoster,
  pickRestaurant,
  fortuneCookie,
  moodPlaylist,
  roastOutfit,
};

export const TOOL_NAMES = Object.keys(tools) as Array<keyof typeof tools>;
