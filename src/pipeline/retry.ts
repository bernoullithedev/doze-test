export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error) {
    const retryable = (error as { retryable?: boolean }).retryable;
    return retryable === true;
  }

  return false;
}

export function calculateBackoffMs(baseMs: number, attempt: number): number {
  return baseMs * 2 ** (attempt - 1);
}

export async function withRetry<T>(
  maxAttempts: number,
  baseMs: number,
  fn: () => Promise<T>
): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      const canRetry = attempt < maxAttempts && isRetryableError(error);
      if (!canRetry) {
        throw error;
      }
      const waitMs = calculateBackoffMs(baseMs, attempt);
      console.warn(`[server] Retrying after error (attempt ${attempt}/${maxAttempts})`, {
        waitMs,
        error: error instanceof Error ? error.message : String(error),
      });
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw new Error("Retries exhausted.");
}
