import { BLISS_V3_KEYS } from '@/lib/storage/schema';

type KeyUse = 'signing' | 'messaging';

interface LocalIdentity {
  signingPrivateJwk: JsonWebKey;
  signingPublicKey: string;
  messagingPrivateJwk: JsonWebKey;
  messagingPublicKey: string;
  createdAt: number;
}

interface StoredIdentity {
  signingPublicKey: string;
  messagingPublicKey: string;
  createdAt: number;
  encryptionSalt?: string;
  signingPrivateJwkEncrypted?: string;
  signingIv?: string;
  messagingPrivateJwkEncrypted?: string;
  messagingIv?: string;
  // Legacy plaintext fallback fields, retained for transparent migration.
  signingPrivateJwk?: JsonWebKey;
  messagingPrivateJwk?: JsonWebKey;
}

function ensureBrowser(): void {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Crypto identity is only available in the browser');
  }
}

function keyFor(walletHash: string): string {
  return `${BLISS_V3_KEYS.identityPrefix}${walletHash}`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function exportPublicKeyToBase64(key: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', key);
  return toBase64(new Uint8Array(spki));
}

async function deriveEncryptionKey(walletHash: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(walletHash),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptJwk(
  key: CryptoKey,
  jwk: JsonWebKey,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(jwk));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    ciphertext: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
  };
}

async function decryptJwk(
  key: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string,
): Promise<JsonWebKey> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivBase64) },
    key,
    fromBase64(ciphertextBase64),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as JsonWebKey;
}

async function encryptIdentity(walletHash: string, identity: LocalIdentity): Promise<StoredIdentity> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveEncryptionKey(walletHash, salt);
  const signing = await encryptJwk(key, identity.signingPrivateJwk);
  const messaging = await encryptJwk(key, identity.messagingPrivateJwk);

  return {
    signingPublicKey: identity.signingPublicKey,
    messagingPublicKey: identity.messagingPublicKey,
    createdAt: identity.createdAt,
    encryptionSalt: toBase64(salt),
    signingPrivateJwkEncrypted: signing.ciphertext,
    signingIv: signing.iv,
    messagingPrivateJwkEncrypted: messaging.ciphertext,
    messagingIv: messaging.iv,
  };
}

async function decryptIdentity(walletHash: string, identity: StoredIdentity): Promise<LocalIdentity | null> {
  if (
    !identity.encryptionSalt
    || !identity.signingPrivateJwkEncrypted
    || !identity.signingIv
    || !identity.messagingPrivateJwkEncrypted
    || !identity.messagingIv
  ) {
    return null;
  }

  const key = await deriveEncryptionKey(walletHash, fromBase64(identity.encryptionSalt));
  const signingPrivateJwk = await decryptJwk(key, identity.signingPrivateJwkEncrypted, identity.signingIv);
  const messagingPrivateJwk = await decryptJwk(key, identity.messagingPrivateJwkEncrypted, identity.messagingIv);

  return {
    signingPrivateJwk,
    signingPublicKey: identity.signingPublicKey,
    messagingPrivateJwk,
    messagingPublicKey: identity.messagingPublicKey,
    createdAt: identity.createdAt,
  };
}

async function loadIdentity(walletHash: string): Promise<StoredIdentity | null> {
  ensureBrowser();
  const raw = localStorage.getItem(keyFor(walletHash));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}

async function saveIdentity(walletHash: string, identity: StoredIdentity): Promise<void> {
  ensureBrowser();
  localStorage.setItem(keyFor(walletHash), JSON.stringify(identity));
}

async function generateIdentity(): Promise<LocalIdentity> {
  ensureBrowser();

  const signingPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify'],
  );

  const messagingPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  );

  return {
    signingPrivateJwk: await crypto.subtle.exportKey('jwk', signingPair.privateKey),
    signingPublicKey: await exportPublicKeyToBase64(signingPair.publicKey),
    messagingPrivateJwk: await crypto.subtle.exportKey('jwk', messagingPair.privateKey),
    messagingPublicKey: await exportPublicKeyToBase64(messagingPair.publicKey),
    createdAt: Date.now(),
  };
}

async function importPrivateKey(walletHash: string, keyUse: KeyUse): Promise<CryptoKey> {
  const identity = await ensureLocalIdentity(walletHash);
  if (keyUse === 'signing') {
    return crypto.subtle.importKey(
      'jwk',
      identity.signingPrivateJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
  }

  return crypto.subtle.importKey(
    'jwk',
    identity.messagingPrivateJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt'],
  );
}

async function importPublicSigningKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    fromBase64(base64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
}

async function importPublicMessagingKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    fromBase64(base64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
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

export async function ensureLocalIdentity(walletHash: string): Promise<LocalIdentity> {
  ensureBrowser();
  const current = await loadIdentity(walletHash);
  if (current) {
    const decrypted = await decryptIdentity(walletHash, current);
    if (decrypted) return decrypted;

    // Legacy migration path: previous versions stored plaintext private JWKs.
    if (current.signingPrivateJwk && current.messagingPrivateJwk) {
      const legacy: LocalIdentity = {
        signingPrivateJwk: current.signingPrivateJwk,
        signingPublicKey: current.signingPublicKey,
        messagingPrivateJwk: current.messagingPrivateJwk,
        messagingPublicKey: current.messagingPublicKey,
        createdAt: current.createdAt,
      };
      const reencrypted = await encryptIdentity(walletHash, legacy);
      await saveIdentity(walletHash, reencrypted);
      return legacy;
    }
  }

  const generated = await generateIdentity();
  const encrypted = await encryptIdentity(walletHash, generated);
  await saveIdentity(walletHash, encrypted);
  return generated;
}

export async function getPublicIdentity(walletHash: string): Promise<{
  signingPublicKey: string;
  messagingPublicKey: string;
}> {
  const identity = await ensureLocalIdentity(walletHash);
  return {
    signingPublicKey: identity.signingPublicKey,
    messagingPublicKey: identity.messagingPublicKey,
  };
}

export async function signCanonicalPayload(walletHash: string, payload: unknown): Promise<string> {
  const privateKey = await importPrivateKey(walletHash, 'signing');
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalJson(payload));
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    data,
  );
  return toBase64(new Uint8Array(signature));
}

export async function verifyCanonicalPayload(
  signerPublicKey: string,
  payload: unknown,
  signature: string,
): Promise<boolean> {
  try {
    const publicKey = await importPublicSigningKey(signerPublicKey);
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalJson(payload));
    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      fromBase64(signature),
      data,
    );
  } catch {
    return false;
  }
}

export interface EncryptedMessagePayload {
  content: string;
  iv: string;
  senderEncryptedKey: string;
  recipientEncryptedKey: string;
}

export async function encryptForParticipants(
  senderWalletHash: string,
  recipientMessagingPublicKey: string,
  plaintext: string,
): Promise<EncryptedMessagePayload> {
  const senderIdentity = await ensureLocalIdentity(senderWalletHash);
  const recipientPublicKey = await importPublicMessagingKey(recipientMessagingPublicKey);
  const senderPublicKey = await importPublicMessagingKey(senderIdentity.messagingPublicKey);

  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(plaintext),
  );

  const rawAesKey = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey));
  const [senderEncryptedKey, recipientEncryptedKey] = await Promise.all([
    crypto.subtle.encrypt({ name: 'RSA-OAEP' }, senderPublicKey, rawAesKey),
    crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientPublicKey, rawAesKey),
  ]);

  return {
    content: toBase64(new Uint8Array(encryptedBuffer)),
    iv: toBase64(iv),
    senderEncryptedKey: toBase64(new Uint8Array(senderEncryptedKey)),
    recipientEncryptedKey: toBase64(new Uint8Array(recipientEncryptedKey)),
  };
}

export async function decryptMessageForViewer(
  viewerWalletHash: string,
  message: {
    senderId: string;
    content: string;
    iv: string;
    senderEncryptedKey: string;
    recipientEncryptedKey: string;
  },
): Promise<string> {
  const privateMessagingKey = await importPrivateKey(viewerWalletHash, 'messaging');
  const encryptedKey = viewerWalletHash === message.senderId
    ? message.senderEncryptedKey
    : message.recipientEncryptedKey;

  const rawKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateMessagingKey,
    fromBase64(encryptedKey),
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(message.iv) },
    aesKey,
    fromBase64(message.content),
  );

  return new TextDecoder().decode(decrypted);
}
