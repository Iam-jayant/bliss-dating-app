import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface EnforceApiRateLimitInput {
  namespace: string;
  identifier: string;
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

type RateLimitFile = Record<string, { count: number; expiresAt: number }>;

const rateLimitFilePath = path.join(process.cwd(), '.bliss-cache', 'rate-limits.json');
let fileLock: Promise<void> = Promise.resolve();

function withFileLock<T>(work: () => Promise<T>): Promise<T> {
  const run = fileLock.then(work, work);
  fileLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

function rateLimitKey(namespace: string, identifier: string): string {
  return `bliss:ratelimit:${namespace}:${identifier}`;
}

async function tryConsumeViaRedis(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult | null> {
  const config = getRedisConfig();
  if (!config) return null;

  try {
    const pipelineResponse = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['TTL', key],
      ]),
      cache: 'no-store',
    });

    if (!pipelineResponse.ok) return null;

    const pipelineData = (await pipelineResponse.json()) as Array<{ result?: number | string | null }>;
    const incremented = Number(pipelineData?.[0]?.result ?? 0);
    let ttl = Number(pipelineData?.[1]?.result ?? -1);

    if (!Number.isFinite(incremented) || incremented <= 0) return null;

    if (ttl < 0) {
      const expireResponse = await fetch(`${config.url}/expire/${encodeURIComponent(key)}/${windowSeconds}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
        cache: 'no-store',
      });
      if (!expireResponse.ok) return null;
      ttl = windowSeconds;
    }

    const allowed = incremented <= maxRequests;
    const remaining = Math.max(0, maxRequests - incremented);

    return {
      allowed,
      remaining,
      resetInSeconds: Math.max(0, ttl),
    };
  } catch {
    return null;
  }
}

async function readRateLimitFile(): Promise<RateLimitFile> {
  try {
    const raw = await readFile(rateLimitFilePath, 'utf8');
    const parsed = JSON.parse(raw) as RateLimitFile;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeRateLimitFile(data: RateLimitFile): Promise<void> {
  await mkdir(path.dirname(rateLimitFilePath), { recursive: true });
  await writeFile(rateLimitFilePath, JSON.stringify(data), 'utf8');
}

async function consumeViaFile(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  return withFileLock(async () => {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const store = await readRateLimitFile();

    for (const [entry, value] of Object.entries(store)) {
      if (!value || value.expiresAt <= now) {
        delete store[entry];
      }
    }

    const current = store[key];
    if (!current || current.expiresAt <= now) {
      store[key] = {
        count: 1,
        expiresAt: now + windowMs,
      };
      await writeRateLimitFile(store);
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - 1),
        resetInSeconds: windowSeconds,
      };
    }

    current.count += 1;
    store[key] = current;
    await writeRateLimitFile(store);

    return {
      allowed: current.count <= maxRequests,
      remaining: Math.max(0, maxRequests - current.count),
      resetInSeconds: Math.max(0, Math.ceil((current.expiresAt - now) / 1000)),
    };
  });
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return 'unknown';
}

export async function enforceApiRateLimit(input: EnforceApiRateLimitInput): Promise<RateLimitResult> {
  const key = rateLimitKey(input.namespace, input.identifier);
  const isProduction = process.env.NODE_ENV === 'production';

  const redisResult = await tryConsumeViaRedis(key, input.maxRequests, input.windowSeconds);
  if (redisResult) {
    return redisResult;
  }

  if (isProduction) {
    throw new Error('Rate-limit datastore unavailable: Redis is required in production.');
  }

  return consumeViaFile(key, input.maxRequests, input.windowSeconds);
}
