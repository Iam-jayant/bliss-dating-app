import type { DatingIntent, ProfileData } from '@/lib/storage/types';
import { BLISS_LEGACY_KEYS, BLISS_SCHEMA_VERSION, BLISS_SCHEMA_VERSION_KEY, BLISS_V3_KEYS } from '@/lib/storage/schema';

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeIntent(value: unknown): DatingIntent {
  if (typeof value !== 'string') return 'not_sure';
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (cleaned === 'long_term') return 'long_term';
  if (cleaned === 'short_term') return 'short_term';
  if (cleaned === 'casual') return 'casual';
  if (cleaned === 'friendship' || cleaned === 'friends') return 'friendship';
  return 'not_sure';
}

function normalizeBioPrompt(value: unknown): ProfileData['bio_prompt_type'] {
  if (typeof value !== 'string') return 'interests';
  const lowered = value.trim().toLowerCase();
  const map: Record<string, ProfileData['bio_prompt_type']> = {
    interests: 'interests',
    passion: 'passion',
    weekend: 'weekend',
    perfect_day: 'perfect_day',
    'my perfect sunday': 'perfect_day',
    fun_fact: 'fun_fact',
    'two truths and a lie': 'fun_fact',
    looking_for: 'looking_for',
    dealbreaker: 'dealbreaker',
    superpower: 'superpower',
    'what makes me unique': 'superpower',
  };
  return map[lowered.replace(/\s+/g, '_')] || map[lowered] || 'interests';
}

function isDemoProfile(profile: Partial<ProfileData>): boolean {
  const hash = profile.wallet_hash || '';
  const address = profile.wallet_address || '';
  return hash.startsWith('demo_') || address.startsWith('aleo1demo');
}

function normalizeProfile(input: Partial<ProfileData>): ProfileData | null {
  if (!input.wallet_hash || !input.wallet_address || isDemoProfile(input)) return null;
  const now = new Date().toISOString();
  return {
    wallet_hash: input.wallet_hash,
    wallet_address: input.wallet_address,
    name: input.name || '',
    age: typeof input.age === 'number' ? input.age : 18,
    bio: input.bio || '',
    bio_prompt_type: normalizeBioPrompt(input.bio_prompt_type),
    interests: Array.isArray(input.interests) ? input.interests.filter((i): i is string => typeof i === 'string') : [],
    dating_intent: normalizeIntent(input.dating_intent),
    profile_image_path: input.profile_image_path || '',
    additional_images: Array.isArray(input.additional_images)
      ? input.additional_images.filter((i): i is string => typeof i === 'string')
      : [],
    signing_public_key: typeof input.signing_public_key === 'string' ? input.signing_public_key : undefined,
    messaging_public_key: typeof input.messaging_public_key === 'string' ? input.messaging_public_key : undefined,
    profile_visibility: input.profile_visibility === 'hidden' ? 'hidden' : 'discoverable',
    location_geohash: typeof input.location_geohash === 'string' ? input.location_geohash : undefined,
    location_name: typeof input.location_name === 'string' ? input.location_name : undefined,
    compatibility_score: typeof input.compatibility_score === 'number' ? input.compatibility_score : undefined,
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
  };
}

function migrateProfiles(): Record<string, ProfileData> {
  const migrated: Record<string, ProfileData> = {};

  const profilesV2 = parseJson<Record<string, ProfileData>>(
    localStorage.getItem(BLISS_LEGACY_KEYS.profilesV2),
    {},
  );

  Object.values(profilesV2).forEach((profile) => {
    const normalized = normalizeProfile(profile);
    if (normalized) migrated[normalized.wallet_hash] = normalized;
  });

  const profileIndex = parseJson<string[]>(localStorage.getItem(BLISS_LEGACY_KEYS.profileIndex), []);
  profileIndex.forEach((walletHash) => {
    const legacy = parseJson<Partial<ProfileData>>(
      localStorage.getItem(`${BLISS_LEGACY_KEYS.profilePrefix}${walletHash}`),
      {},
    );
    const normalized = normalizeProfile(legacy);
    if (normalized) migrated[normalized.wallet_hash] = normalized;
  });

  return migrated;
}

function filterOutDemoUsers<T>(records: T[], extractUserFields: (record: T) => string[]): T[] {
  return records.filter((record) => {
    const users = extractUserFields(record);
    return users.every((u) => !u.startsWith('demo_'));
  });
}

function cleanupLegacyKeys(): void {
  localStorage.removeItem(BLISS_LEGACY_KEYS.seedFlag);
  localStorage.removeItem(BLISS_LEGACY_KEYS.profileIndex);
  localStorage.removeItem(BLISS_LEGACY_KEYS.likesV2);
  localStorage.removeItem(BLISS_LEGACY_KEYS.matchesV2);
  localStorage.removeItem(BLISS_LEGACY_KEYS.passesV2);

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(BLISS_LEGACY_KEYS.profilePrefix) && key.includes('demo_')) {
      localStorage.removeItem(key);
    }
    if (key.startsWith('bliss_chat_') || key.startsWith('bliss_messages_')) {
      const suffix = key.replace(/^bliss_(chat|messages)_/, '');
      const newKey = `${BLISS_V3_KEYS.messagesPrefix}${suffix}`;
      if (!localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, localStorage.getItem(key) || '[]');
      }
      localStorage.removeItem(key);
    }
  }
}

export function runBlissV3Migration(): void {
  if (typeof window === 'undefined') return;
  const existingVersion = Number(localStorage.getItem(BLISS_SCHEMA_VERSION_KEY) || 0);
  if (existingVersion >= BLISS_SCHEMA_VERSION) return;

  const profiles = migrateProfiles();
  localStorage.setItem(BLISS_V3_KEYS.profilesByHash, JSON.stringify(profiles));

  const likes = parseJson<any[]>(localStorage.getItem(BLISS_LEGACY_KEYS.likesV1), []);
  const matches = parseJson<any[]>(localStorage.getItem(BLISS_LEGACY_KEYS.matchesV1), []);
  const passes = parseJson<any[]>(localStorage.getItem(BLISS_LEGACY_KEYS.passesV2), []);

  localStorage.setItem(
    BLISS_V3_KEYS.likes,
    JSON.stringify(filterOutDemoUsers(likes, (r: any) => [String(r.from || ''), String(r.to || '')])),
  );
  localStorage.setItem(
    BLISS_V3_KEYS.matches,
    JSON.stringify(filterOutDemoUsers(matches, (r: any) => [String(r.user1 || ''), String(r.user2 || '')])),
  );
  localStorage.setItem(
    BLISS_V3_KEYS.passes,
    JSON.stringify(filterOutDemoUsers(passes, (r: any) => [String(r.from || ''), String(r.to || '')])),
  );

  const blockedUsers = parseJson<string[]>(localStorage.getItem(BLISS_LEGACY_KEYS.blockedUsers), []);
  localStorage.setItem(BLISS_V3_KEYS.blockedUsers, JSON.stringify(blockedUsers.filter((u) => !u.startsWith('demo_'))));

  const settings = parseJson<Record<string, unknown>>(localStorage.getItem(BLISS_LEGACY_KEYS.settings), {});
  if (Object.keys(settings).length > 0) {
    localStorage.setItem(BLISS_V3_KEYS.settings, JSON.stringify(settings));
  }

  cleanupLegacyKeys();
  localStorage.setItem(BLISS_SCHEMA_VERSION_KEY, String(BLISS_SCHEMA_VERSION));
}
