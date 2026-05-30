/**
 * Shared pending-attachments side-channel.
 *
 * Tools that produce files (posters, etc.) push entries here.
 * After each agent turn, `agent.ts` drains the queue and includes the paths in
 * the AgentChatResponse so outbound delivery can send them as attachments.
 */

const pendingAttachments: Array<{ filePath: string; fileName: string }> = [];

/** Image paths from the current user message — used by roastOutfit. */
let availablePhotos: string[] = [];

export function addPendingAttachment(filePath: string, fileName: string): void {
  pendingAttachments.push({ filePath, fileName });
}

export function drainPendingAttachments(): Array<{ filePath: string; fileName: string }> {
  return pendingAttachments.splice(0);
}

export function setAvailablePhotos(paths: string[]): void {
  availablePhotos = paths;
}

export function getAvailablePhotos(): string[] {
  return availablePhotos;
}
