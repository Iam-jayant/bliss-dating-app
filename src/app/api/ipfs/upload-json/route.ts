import { NextResponse } from 'next/server';
import { verifySignedUploadProof, type SignedUploadProof } from '@/lib/security/upload-proof';
import { enforceApiRateLimit, getClientIp } from '@/lib/security/rate-limit';

interface UploadJsonRequest {
  payload: unknown;
  name?: string;
  keyvalues?: Record<string, string>;
  proof?: SignedUploadProof;
}

const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const PROOF_TTL_MS = 10 * 60 * 1000;

async function verifyUploadProof(body: UploadJsonRequest): Promise<boolean> {
  const result = await verifySignedUploadProof(body.proof, body.payload, {
    namespace: 'ipfs-upload-json',
    ttlMs: PROOF_TTL_MS,
    maxFutureSkewMs: MAX_FUTURE_CLOCK_SKEW_MS,
  });
  return result.ok;
}

function getPinataJwt(): string {
  const jwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) {
    throw new Error('PINATA_JWT is not configured on the server (set server-only PINATA_JWT in .env)');
  }
  return jwt;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UploadJsonRequest;
    if (typeof body !== 'object' || body === null || body.payload === undefined) {
      return NextResponse.json({ error: 'Missing payload for JSON upload' }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    const ipRate = await enforceApiRateLimit({
      namespace: 'ipfs-upload-json-ip',
      identifier: clientIp,
      maxRequests: 60,
      windowSeconds: 60,
    });
    if (!ipRate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded for upload-json (ip).' }, { status: 429 });
    }

    const walletHash = body.proof?.walletHash;
    if (walletHash) {
      const walletRate = await enforceApiRateLimit({
        namespace: 'ipfs-upload-json-wallet',
        identifier: walletHash,
        maxRequests: 30,
        windowSeconds: 60,
      });
      if (!walletRate.allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded for upload-json (wallet).' }, { status: 429 });
      }
    }

    const isProofValid = await verifyUploadProof(body);
    if (!isProofValid) {
      return NextResponse.json({ error: 'Invalid upload proof' }, { status: 401 });
    }

    const pinataBody = {
      pinataContent: body.payload,
      pinataMetadata: {
        name: body.name || 'Bliss JSON Payload',
        keyvalues: {
          app: 'bliss',
          ...(body.keyvalues || {}),
        },
      },
    };

    const upstreamResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getPinataJwt()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pinataBody),
    });

    if (!upstreamResponse.ok) {
      const details = await upstreamResponse.text();
      return NextResponse.json({ error: 'Pinata JSON upload failed', details }, { status: 502 });
    }

    const data = (await upstreamResponse.json()) as { IpfsHash?: string };
    if (!data.IpfsHash) {
      return NextResponse.json({ error: 'Pinata response missing IpfsHash' }, { status: 502 });
    }

    return NextResponse.json({ cid: data.IpfsHash }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected JSON upload error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
