import { NextResponse } from 'next/server';
import { verifySignedUploadProof, type SignedUploadProof } from '@/lib/security/upload-proof';
import { enforceApiRateLimit, getClientIp } from '@/lib/security/rate-limit';

interface UnpinRequestBody {
  cid?: string;
  owner?: string;
  proof?: SignedUploadProof;
}

interface PinListResponse {
  rows?: Array<{
    ipfs_pin_hash?: string;
    metadata?: {
      keyvalues?: Record<string, string>;
    };
  }>;
}

const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const PROOF_TTL_MS = 10 * 60 * 1000;

function getPinataJwt(): string {
  const jwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) {
    throw new Error('PINATA_JWT is not configured on the server (set server-only PINATA_JWT in .env)');
  }
  return jwt;
}

async function verifyPinnedOwner(cid: string, owner: string): Promise<boolean> {
  const params = new URLSearchParams({
    hashContains: cid,
    status: 'pinned',
    pageLimit: '10',
  });

  const response = await fetch(`https://api.pinata.cloud/data/pinList?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getPinataJwt()}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as PinListResponse;
  const exactMatch = data.rows?.find((row) => row.ipfs_pin_hash === cid);
  if (!exactMatch) return false;
  const metadataOwner = exactMatch.metadata?.keyvalues?.owner;
  return typeof metadataOwner === 'string' && metadataOwner === owner;
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const ipRate = await enforceApiRateLimit({
      namespace: 'ipfs-unpin-ip',
      identifier: clientIp,
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!ipRate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded for unpin (ip).' }, { status: 429 });
    }

    const body = (await request.json()) as UnpinRequestBody;
    const cid = body?.cid?.trim();
    const owner = body?.owner?.trim();

    if (!cid) {
      return NextResponse.json({ error: 'Missing CID for unpin operation' }, { status: 400 });
    }

    if (!owner) {
      return NextResponse.json({ error: 'Missing owner for unpin operation' }, { status: 400 });
    }

    const walletHash = body.proof?.walletHash;
    if (walletHash) {
      const walletRate = await enforceApiRateLimit({
        namespace: 'ipfs-unpin-wallet',
        identifier: walletHash,
        maxRequests: 10,
        windowSeconds: 60,
      });
      if (!walletRate.allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded for unpin (wallet).' }, { status: 429 });
      }
    }

    const verifyResult = await verifySignedUploadProof(
      body.proof,
      { cid, owner },
      {
        namespace: 'ipfs-unpin',
        ttlMs: PROOF_TTL_MS,
        maxFutureSkewMs: MAX_FUTURE_CLOCK_SKEW_MS,
      },
    );

    if (!verifyResult.ok) {
      return NextResponse.json({ error: 'Invalid unpin proof' }, { status: 401 });
    }

    const isOwner = await verifyPinnedOwner(cid, owner);
    if (!isOwner) {
      return NextResponse.json({ error: 'Owner is not authorized to unpin this CID' }, { status: 403 });
    }

    const upstreamResponse = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getPinataJwt()}`,
      },
    });

    if (!upstreamResponse.ok) {
      const details = await upstreamResponse.text();
      return NextResponse.json({ error: 'Pinata unpin failed', details }, { status: 502 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected unpin error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
