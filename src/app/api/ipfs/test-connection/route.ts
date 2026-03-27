import { NextResponse } from 'next/server';

function getPinataJwt(): string {
  const jwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) {
    throw new Error('PINATA_JWT is not configured on the server (set server-only PINATA_JWT in .env)');
  }
  return jwt;
}

export async function GET() {
  try {
    const upstreamResponse = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${getPinataJwt()}`,
      },
      cache: 'no-store',
    });

    if (!upstreamResponse.ok) {
      const details = await upstreamResponse.text();
      return NextResponse.json({ ok: false, details }, { status: 502 });
    }

    const data = await upstreamResponse.json();
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected test-connection error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
