export const BLISS_SCHEMA_VERSION = 3;
export const BLISS_SCHEMA_VERSION_KEY = 'bliss_v3_schema_version';

export const BLISS_V3_KEYS = {
  profilesByHash: 'bliss_v3_profiles_by_hash',
  likes: 'bliss_v3_likes',
  matches: 'bliss_v3_matches',
  passes: 'bliss_v3_passes',
  blockedUsers: 'bliss_v3_blocked_users',
  settings: 'bliss_v3_settings',
  reports: 'bliss_v3_reports',
  identityPrefix: 'bliss_v3_identity_',
  ageVerificationPrefix: 'bliss_v3_age_verified_',
  subscriptionPrefix: 'bliss_v3_sub_',
  swipeUsagePrefix: 'bliss_v3_swipes_',
  pendingSwipeSettlementPrefix: 'bliss_v3_pending_swipe_settlement_',
  superLikeUsagePrefix: 'bliss_v3_superlikes_',
  messagesPrefix: 'bliss_v3_messages_',
} as const;

export const BLISS_LEGACY_KEYS = {
  seedFlag: 'bliss_demo_seeded_v3',
  profileIndex: 'bliss_profiles_index',
  profilePrefix: 'bliss_profile_',
  profilesV2: 'bliss_profiles_v2',
  likesV1: 'bliss_likes_v1',
  likesV2: 'bliss_likes_v2',
  matchesV1: 'bliss_matches_v1',
  matchesV2: 'bliss_matches_v2',
  passesV2: 'bliss_passes_v2',
  blockedUsers: 'bliss_blocked_users',
  settings: 'bliss_settings',
} as const;

export type BlissV3Key = (typeof BLISS_V3_KEYS)[keyof typeof BLISS_V3_KEYS];
