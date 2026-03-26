import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface ConsumeReplayNonceInput {
  namespace: string;
  walletHash: string;
  nonce: string;
  ttlSeconds: number;
}

type ReplayNonceFile = Record<string, number>;

const replayFilePath = path.join(process.cwd(), '.bliss-cache', 'replay-nonces.json');
let fileLock: Promise<void> = Promise.resolve();

function withFileLock<T>(work: () => Promise<T>): Promise<T> {
  const run = fileLock.then(work, work);
  fileLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function replayKey(namespace: string, walletHash: string, nonce: string): string {
  return `bliss:replay:${namespace}:${walletHash}:${nonce}`;
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

async function tryConsumeViaRedis(key: string, ttlSeconds: number): Promise<boolean | null> {
  const config = getRedisConfig();
  if (!config) return null;

  try {
    const endpoint = `${config.url}/set/${encodeURIComponent(key)}/${Date.now()}?NX=true&EX=${ttlSeconds}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { result?: string | null };
    if (data.result === 'OK') return true;
    if (data.result === null) return false;
    return null;
  } catch {
    return null;
  }
}

async function readReplayFile(): Promise<ReplayNonceFile> {
  try {
    const raw = await readFile(replayFilePath, 'utf8');
    const parsed = JSON.parse(raw) as ReplayNonceFile;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeReplayFile(data: ReplayNonceFile): Promise<void> {
  await mkdir(path.dirname(replayFilePath), { recursive: true });
  await writeFile(replayFilePath, JSON.stringify(data), 'utf8');
}

async function consumeViaFile(key: string, ttlSeconds: number): Promise<boolean> {
  return withFileLock(async () => {
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    const store = await readReplayFile();

    for (const [entry, expiry] of Object.entries(store)) {
      if (expiry <= now) {
        delete store[entry];
      }
    }

    if (store[key] && store[key] > now) {
      return false;
    }

    store[key] = expiresAt;
    await writeReplayFile(store);
    return true;
  });
}

export async function consumeReplayNonce(input: ConsumeReplayNonceInput): Promise<boolean> {
  const key = replayKey(input.namespace, input.walletHash, input.nonce);
  const isProduction = process.env.NODE_ENV === 'production';

  const redisResult = await tryConsumeViaRedis(key, input.ttlSeconds);
  if (redisResult !== null) {
    return redisResult;
  }

  if (isProduction) {
    throw new Error('Replay protection datastore unavailable: Redis is required in production.');
  }

  return consumeViaFile(key, input.ttlSeconds);
}