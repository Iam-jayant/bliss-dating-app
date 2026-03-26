import { NextResponse } from 'next/server';
import { verifySignedUploadProof, type SignedUploadProof } from '@/lib/security/upload-proof';
import { enforceApiRateLimit, getClientIp } from '@/lib/security/rate-limit';

const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const PROOF_TTL_MS = 10 * 60 * 1000;

function getPinataJwt(): string {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error('PINATA_JWT is not configured on the server');
  }
  return jwt;
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const ipRate = await enforceApiRateLimit({
      namespace: 'ipfs-upload-image-ip',
      identifier: clientIp,
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!ipRate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded for upload-image (ip).' }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file upload payload' }, { status: 400 });
    }

    const owner = formData.get('owner');
    const type = formData.get('type');
    const name = formData.get('name');
    const proofRaw = formData.get('proof');

    if (typeof proofRaw !== 'string' || proofRaw.trim().length === 0) {
      return NextResponse.json({ error: 'Missing signed upload proof' }, { status: 401 });
    }

    const proof = JSON.parse(proofRaw) as SignedUploadProof;

    const walletHash = proof?.walletHash;
    if (walletHash) {
      const walletRate = await enforceApiRateLimit({
        namespace: 'ipfs-upload-image-wallet',
        identifier: walletHash,
        maxRequests: 20,
        windowSeconds: 60,
      });
      if (!walletRate.allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded for upload-image (wallet).' }, { status: 429 });
      }
    }

    if (!proof) {
      return NextResponse.json({ error: 'Invalid image upload proof payload' }, { status: 401 });
    }

    const verifyResult = await verifySignedUploadProof(
      proof,
      {
        metadata: {
          owner,
          type,
          name,
        },
      },
      {
      namespace: 'ipfs-upload-image',
        ttlMs: PROOF_TTL_MS,
        maxFutureSkewMs: MAX_FUTURE_CLOCK_SKEW_MS,
      },
    );

    if (!verifyResult.ok) {
      if (verifyResult.reason === 'replay') {
        return NextResponse.json({ error: 'Replay detected for image upload proof' }, { status: 401 });
      }
      if (verifyResult.reason === 'timestamp') {
        return NextResponse.json({ error: 'Invalid image upload timestamp' }, { status: 401 });
      }
      if (verifyResult.reason === 'signature') {
        return NextResponse.json({ error: 'Invalid image upload proof signature' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Invalid image upload proof payload' }, { status: 401 });
    }

    const metadata = {
      name: typeof name === 'string' && name.trim().length > 0
        ? name
        : `Bliss Upload - ${file.name}`,
      keyvalues: {
        app: 'bliss',
        type: typeof type === 'string' && type.trim().length > 0 ? type : 'upload',
        ...(typeof owner === 'string' && owner.trim().length > 0 ? { owner } : {}),
      },
    };

    const upstreamForm = new FormData();
    upstreamForm.append('file', file, file.name);
    upstreamForm.append('pinataMetadata', JSON.stringify(metadata));

    const upstreamResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getPinataJwt()}`,
      },
      body: upstreamForm,
    });

    if (!upstreamResponse.ok) {
      const details = await upstreamResponse.text();
      return NextResponse.json({ error: 'Pinata upload failed', details }, { status: 502 });
    }

    const data = (await upstreamResponse.json()) as { IpfsHash?: string };
    if (!data.IpfsHash) {
      return NextResponse.json({ error: 'Pinata response missing IpfsHash' }, { status: 502 });
    }

    return NextResponse.json({ cid: data.IpfsHash }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected upload error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
