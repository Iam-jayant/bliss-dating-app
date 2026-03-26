import { consumeReplayNonce } from '@/lib/security/replay-store';

export interface SignedUploadProof {
  walletHash: string;
  nonce: string;
  timestamp: number;
  signerPublicKey: string;
  signature: string;
}

interface VerifyProofOptions {
  namespace: string;
  ttlMs: number;
  maxFutureSkewMs: number;
}

interface VerifyProofResult {
  ok: boolean;
  reason?: 'missing' | 'timestamp' | 'signature' | 'replay';
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => normalize(entry));
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {} as Record<string, unknown>);
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function decodeBase64(value: string): ArrayBuffer {
  const bytes = Uint8Array.from(Buffer.from(value, 'base64'));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function verifyCanonicalPayload(
  signerPublicKey: string,
  payload: unknown,
  signature: string,
): Promise<boolean> {
  try {
    const publicKey = await crypto.subtle.importKey(
      'spki',
      decodeBase64(signerPublicKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );

    const encodedPayload = new TextEncoder().encode(canonicalJson(payload));
    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      decodeBase64(signature),
      encodedPayload,
    );
  } catch {
    return false;
  }
}

export async function verifySignedUploadProof(
  proof: SignedUploadProof | undefined,
  payload: unknown,
  options: VerifyProofOptions,
): Promise<VerifyProofResult> {
  if (
    !proof
    || !proof.walletHash
    || !proof.nonce
    || typeof proof.timestamp !== 'number'
    || !proof.signerPublicKey
    || !proof.signature
  ) {
    return { ok: false, reason: 'missing' };
  }

  if (
    proof.timestamp > Date.now() + options.maxFutureSkewMs
    || proof.timestamp < Date.now() - options.ttlMs
  ) {
    return { ok: false, reason: 'timestamp' };
  }

  const signatureValid = await verifyCanonicalPayload(
    proof.signerPublicKey,
    {
      walletHash: proof.walletHash,
      nonce: proof.nonce,
      timestamp: proof.timestamp,
      payload,
    },
    proof.signature,
  );

  if (!signatureValid) {
    return { ok: false, reason: 'signature' };
  }

  const nonceAccepted = await consumeReplayNonce({
    namespace: options.namespace,
    walletHash: proof.walletHash,
    nonce: proof.nonce,
    ttlSeconds: Math.floor(options.ttlMs / 1000),
  });

  if (!nonceAccepted) {
    return { ok: false, reason: 'replay' };
  }

  return { ok: true };
}