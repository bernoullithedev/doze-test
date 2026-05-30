import { tool } from "ai";
import { z } from "zod";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getCurrentSender, sanitizeTag } from "../memory.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data", "lists");

interface ListItem {
  item: string;
  checked: boolean;
}

type UserLists = Record<string, ListItem[]>;

function userFilePath(sender: string): string {
  return join(DATA_DIR, `${sanitizeTag(sender)}.json`);
}

async function loadLists(sender: string): Promise<UserLists> {
  try {
    const raw = await readFile(userFilePath(sender), "utf-8");
    return JSON.parse(raw) as UserLists;
  } catch {
    return {};
  }
}

async function saveLists(sender: string, lists: UserLists): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(userFilePath(sender), JSON.stringify(lists, null, 2));
}

function formatList(name: string, items: ListItem[]): string {
  if (items.length === 0) return `${name}: (empty)`;
  const lines = items.map((i) => `${i.checked ? "[x]" : "[ ]"} ${i.item}`);
  return `${name}:\n${lines.join("\n")}`;
}

export const manageList = tool({
  description:
    "Manage persistent lists — shopping lists, guest lists, todo lists. Lists persist across conversations.",
  inputSchema: z.object({
    action: z.enum([
      "create",
      "view",
      "add",
      "remove",
      "check",
      "uncheck",
      "clear",
      "delete",
      "list_all",
    ]).describe("Action to perform"),
    listName: z.string().describe("Name of the list, e.g. 'beach trip'"),
    items: z.array(z.string()).optional().describe("Items to add/remove/check/uncheck"),
  }),
  execute: async ({ action, listName, items }) => {
    const sender = getCurrentSender();
    const lists = await loadLists(sender);
    const name = listName.toLowerCase().trim();

    let result: string;

    switch (action) {
      case "create": {
        lists[name] = (items ?? []).map((item) => ({ item, checked: false }));
        await saveLists(sender, lists);
        const count = lists[name].length;
        result =
          count > 0
            ? `Created "${name}" with ${count} item(s):\n${formatList(name, lists[name])}`
            : `Created empty list "${name}"`;
        break;
      }

      case "view": {
        if (!lists[name]) {
          result = `No list called "${name}" found`;
          break;
        }
        result = formatList(name, lists[name]);
        break;
      }

      case "add": {
        if (!lists[name]) lists[name] = [];
        const newItems = (items ?? []).map((item) => ({ item, checked: false }));
        lists[name].push(...newItems);
        await saveLists(sender, lists);
        result = `Added ${newItems.length} item(s) to "${name}":\n${formatList(name, lists[name])}`;
        break;
      }

      case "remove": {
        if (!lists[name]) {
          result = `No list called "${name}" found`;
          break;
        }
        const toRemove = new Set((items ?? []).map((i) => i.toLowerCase()));
        lists[name] = lists[name].filter((i) => !toRemove.has(i.item.toLowerCase()));
        await saveLists(sender, lists);
        result = `Removed items from "${name}":\n${formatList(name, lists[name])}`;
        break;
      }

      case "check": {
        if (!lists[name]) {
          result = `No list called "${name}" found`;
          break;
        }
        const toCheck = new Set((items ?? []).map((i) => i.toLowerCase()));
        for (const li of lists[name]) {
          if (toCheck.has(li.item.toLowerCase())) li.checked = true;
        }
        await saveLists(sender, lists);
        result = `Checked off items in "${name}":\n${formatList(name, lists[name])}`;
        break;
      }

      case "uncheck": {
        if (!lists[name]) {
          result = `No list called "${name}" found`;
          break;
        }
        const toUncheck = new Set((items ?? []).map((i) => i.toLowerCase()));
        for (const li of lists[name]) {
          if (toUncheck.has(li.item.toLowerCase())) li.checked = false;
        }
        await saveLists(sender, lists);
        result = `Unchecked items in "${name}":\n${formatList(name, lists[name])}`;
        break;
      }

      case "clear": {
        if (!lists[name]) {
          result = `No list called "${name}" found`;
          break;
        }
        lists[name] = lists[name].filter((i) => !i.checked);
        await saveLists(sender, lists);
        result = `Cleared checked items from "${name}":\n${formatList(name, lists[name])}`;
        break;
      }

      case "delete": {
        if (!lists[name]) {
          result = `No list called "${name}" found`;
          break;
        }
        delete lists[name];
        await saveLists(sender, lists);
        result = `Deleted list "${name}"`;
        break;
      }

      case "list_all": {
        const names = Object.keys(lists);
        if (names.length === 0) {
          result = "No lists yet";
          break;
        }
        result = `${names.length} list(s):\n${names
          .map((n) => {
            const listItems = lists[n] ?? [];
            const checked = listItems.filter((i) => i.checked).length;
            return `- ${n} (${checked}/${listItems.length} checked)`;
          })
          .join("\n")}`;
        break;
      }

      default:
        result = "Unknown action";
    }

    console.log(`[agent] tool:done manageList "${action} ${name}"`);
    return result;
  },
});
