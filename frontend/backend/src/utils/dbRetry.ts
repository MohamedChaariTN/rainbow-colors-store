import { Prisma } from '@prisma/client';

/**
 * Prisma/PostgreSQL error codes that can be safely retried for read-only
 * operations. Authentication, permission and "database does not exist"
 * errors are intentionally excluded: retrying them only hides the cause.
 */
const RETRYABLE_PRISMA_CODES = new Set([
  'P1001', // Cannot reach the database server
  'P1002', // Database server timed out
  'P1008', // Operation timed out
  'P1017', // Server has closed the connection
  'P2024', // Timed out fetching a connection from the pool
  'P2034', // Transaction conflict/deadlock (safe for reads)
]);

const RETRYABLE_MESSAGES = [
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /EPIPE/i,
  /server has closed the connection/i,
  /connection (?:was )?closed/i,
  /connection reset/i,
  /can't reach database server/i,
  /database system is starting up/i,
  /timed out fetching a new connection/i,
  /too many connections/i,
];

export interface DbRetryOptions {
  /** Total attempts, including the first one. Defaults to 2. */
  attempts?: number;
  /** Delay before the first retry. Defaults to 300 ms. */
  baseDelayMs?: number;
  /** Maximum delay between retries. Defaults to 2 seconds. */
  maxDelayMs?: number;
}

export function getDbErrorCode(err: unknown): string | undefined {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return err.code;
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

export function isRetryableDbError(err: unknown): boolean {
  const code = getDbErrorCode(err);
  if (code && RETRYABLE_PRISMA_CODES.has(code)) return true;

  const message = String((err as { message?: unknown } | null)?.message ?? err ?? '');
  return RETRYABLE_MESSAGES.some((pattern) => pattern.test(message));
}

/** Short, single-line description safe for server logs (never includes the URL/password). */
export function describeDbError(err: unknown): string {
  const code = getDbErrorCode(err);
  const name = (err as { name?: unknown } | null)?.name;
  const message = String((err as { message?: unknown } | null)?.message ?? err ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' | ')
    .slice(0, 400);

  return [code, name, message].filter(Boolean).join(' | ') || 'Unknown database error';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a database operation with a small, bounded exponential backoff.
 * Use this only for idempotent reads, never for create/update/delete calls.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: DbRetryOptions = {}
): Promise<T> {
  const attempts = Math.max(1, Math.min(options.attempts ?? 2, 5));
  const baseDelayMs = Math.max(50, options.baseDelayMs ?? 300);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 2000);

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt >= attempts || !isRetryableDbError(err)) throw err;

      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(backoff * 0.25)));
      await sleep(backoff + jitter);
    }
  }

  throw lastError;
}
