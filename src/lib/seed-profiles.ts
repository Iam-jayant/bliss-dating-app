/**
 * Demo Profile Seeder
 * 
 * Seeds 18 realistic profiles into the real storage layer (localStorage)
 * for demo/video purposes. Also creates 2 mutual matches with
 * pre-existing message threads.
 * 
 * Writes to:
 *  - bliss_profile_<hash> + bliss_profiles_index  (profile.ts storage)
 *  - bliss_profiles_v2                             (gun-storage.ts storage)
 *  - bliss_likes_v1 + bliss_matches_v1             (matching storage)
 *  - bliss_messages_<key>                          (message storage)
 * 
 * Call `seedDemoData(userWalletHash)` once on app start.  
 * It is idempotent — skips if data already exists.
 */

import type { ProfileData, BioPromptType, DatingIntent } from '@/lib/storage/types';

// ─── CONSTANTS ───────────────────────────────────────────────────────

const SEED_FLAG = 'bliss_demo_seeded_v3';
const PROFILE_PREFIX = 'bliss_profile_';
const PROFILES_INDEX = 'bliss_profiles_index';
const GUN_PROFILES_KEY = 'bliss_profiles_v2';
const LIKES_KEY = 'bliss_likes_v1';
const MATCHES_KEY = 'bliss_matches_v1';

// ─── DEMO PROFILES ──────────────────────────────────────────────────

interface SeedProfile {
  hash: string;          // deterministic fake hash
  name: string;
  age: number;
  bio: string;
  bioPrompt: BioPromptType;
  interests: string[];
  intent: DatingIntent;
  location: string;
  geohash: string;
}

const DEMO_PROFILES: SeedProfile[] = [
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60001',
    name: 'Aria Chen',
    age: 24,
    bio: "Product designer who codes on weekends. I'll judge you by your Spotify wrapped and your coffee order (oat milk latte, obviously). Let's find a farmers market and get lost in it.",
    bioPrompt: 'interests',
    interests: ['Art', 'Tech', 'Coffee', 'Music'],
    intent: 'long_term',
    location: 'San Francisco, CA',
    geohash: '9q8yyk',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60002',
    name: 'Marcus Rivera',
    age: 27,
    bio: "Rock climbing instructor by day, amateur astronomer by night. I can cook a mean paella and hold a conversation about literally anything from black holes to reality TV.",
    bioPrompt: 'passion',
    interests: ['Fitness', 'Cooking', 'Nature', 'Outdoors'],
    intent: 'long_term',
    location: 'Austin, TX',
    geohash: '9v6kn0',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60003',
    name: 'Priya Sharma',
    age: 25,
    bio: "PhD student in neuroscience. I'll explain how dopamine works while we're at a concert. Also obsessed with bouldering and matcha. Swipe right if you like nerdy jokes.",
    bioPrompt: 'fun_fact',
    interests: ['Music', 'Books', 'Fitness', 'Coffee'],
    intent: 'long_term',
    location: 'Boston, MA',
    geohash: 'drt2yz',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60004',
    name: 'Jake Morrison',
    age: 29,
    bio: "Startup founder who actually touches grass. Weekend warrior — surfing, trail running, or building something cool. Looking for someone who's passionate about literally anything.",
    bioPrompt: 'weekend',
    interests: ['Tech', 'Surfing', 'Fitness', 'Travel'],
    intent: 'long_term',
    location: 'Los Angeles, CA',
    geohash: '9q5ctr',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60005',
    name: 'Luna Park',
    age: 23,
    bio: "Film student and part-time barista. I rate everything out of 10 — food, sunsets, your music taste. Currently rewatching the entire Studio Ghibli collection for the 4th time.",
    bioPrompt: 'perfect_day',
    interests: ['Movies', 'Art', 'Photography', 'Coffee'],
    intent: 'not_sure',
    location: 'New York, NY',
    geohash: 'dr5reg',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60006',
    name: 'Ethan Brooks',
    age: 26,
    bio: "Marine biologist. Yes, I've swum with sharks. No, I will not shut up about ocean conservation. Will absolutely plan a beach cleanup as a date. Non-negotiable.",
    bioPrompt: 'passion',
    interests: ['Nature', 'Surfing', 'Photography', 'Travel'],
    intent: 'long_term',
    location: 'San Diego, CA',
    geohash: '9mudm5',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60007',
    name: 'Sophie Andersen',
    age: 28,
    bio: "ER nurse who somehow still believes in romance. I'll patch you up after your skateboard fail and then drag you to hot yoga. Yes, both are non-negotiable.",
    bioPrompt: 'looking_for',
    interests: ['Yoga', 'Fitness', 'Cooking', 'Dancing'],
    intent: 'long_term',
    location: 'Chicago, IL',
    geohash: 'dp3wjz',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60008',
    name: 'Kai Nakamura',
    age: 25,
    bio: "Music producer and vinyl collector. My apartment is 40% records, 40% plants, 20% livable space. Looking for someone who appreciates a good bassline and even better ramen.",
    bioPrompt: 'interests',
    interests: ['Music', 'Food', 'Art', 'Concerts'],
    intent: 'casual',
    location: 'Portland, OR',
    geohash: '9r9hfs',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60009',
    name: 'Olivia Torres',
    age: 26,
    bio: "Mechanical engineer who salsa dances. I design rocket parts during the week and tear up the dance floor on Friday. Looking for someone who can keep up — in both.",
    bioPrompt: 'superpower',
    interests: ['Dancing', 'Tech', 'Fitness', 'Music'],
    intent: 'long_term',
    location: 'Houston, TX',
    geohash: '9vk1kp',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60010',
    name: 'Ryan Okafor',
    age: 30,
    bio: "Architect by trade, urban sketcher by passion. I see every city as a canvas. Let me draw you at a cafe while you pretend not to be flattered.",
    bioPrompt: 'perfect_day',
    interests: ['Art', 'Travel', 'Photography', 'Coffee'],
    intent: 'long_term',
    location: 'Denver, CO',
    geohash: '9xj64s',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60011',
    name: 'Maya Johansson',
    age: 24,
    bio: "Yoga teacher and amateur potter. My ideal date is sunrise yoga followed by a pottery class where we recreate that Ghost scene (poorly). Bonus points if you laugh at my puns.",
    bioPrompt: 'fun_fact',
    interests: ['Yoga', 'Art', 'Meditation', 'Nature'],
    intent: 'friendship',
    location: 'Seattle, WA',
    geohash: 'c23nb6',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60012',
    name: 'Liam O\'Brien',
    age: 27,
    bio: "Stand-up comedian and data analyst. Yes, I run A/B tests on my jokes. Currently optimizing for laughs-per-minute. My conversion rate is... improving.",
    bioPrompt: 'fun_fact',
    interests: ['Writing', 'Tech', 'Movies', 'Food'],
    intent: 'casual',
    location: 'Nashville, TN',
    geohash: 'dn68p2',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60013',
    name: 'Zara Adhikari',
    age: 22,
    bio: "Environmental science major and amateur mushroom forager. I'll make you fall in love with composting. Third date is a hike to find chanterelles.",
    bioPrompt: 'passion',
    interests: ['Nature', 'Hiking', 'Cooking', 'Books'],
    intent: 'not_sure',
    location: 'Portland, OR',
    geohash: '9r9hfs',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60014',
    name: 'Noah Kim',
    age: 28,
    bio: "Full-stack developer and weekend DJ. My code compiles on the first try about as often as my DJ sets go without a trainwreck — but we keep shipping.",
    bioPrompt: 'weekend',
    interests: ['Tech', 'Music', 'Gaming', 'Concerts'],
    intent: 'short_term',
    location: 'Miami, FL',
    geohash: 'dhwfhx',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60015',
    name: 'Ava Rosenberg',
    age: 25,
    bio: "Pastry chef with strong opinions on sourdough. I'll feed you croissants and debate whether Die Hard is a Christmas movie. (It is.) Must love dogs.",
    bioPrompt: 'dealbreaker',
    interests: ['Food', 'Cooking', 'Movies', 'Reading'],
    intent: 'long_term',
    location: 'Philadelphia, PA',
    geohash: 'dr4e0m',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60016',
    name: 'Diego Santos',
    age: 26,
    bio: "Capoeira instructor and graphic novelist. Currently drawing a comic about a time-traveling barista. First chapter available upon request (it's actually good, I promise).",
    bioPrompt: 'superpower',
    interests: ['Art', 'Fitness', 'Writing', 'Dancing'],
    intent: 'long_term',
    location: 'Brooklyn, NY',
    geohash: 'dr5rek',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60017',
    name: 'Elena Volkov',
    age: 29,
    bio: "Astrophysicist who ballroom dances. I study dark matter by day and waltz by night. Looking for a partner — on the dance floor and in curiosity about the universe.",
    bioPrompt: 'looking_for',
    interests: ['Books', 'Dancing', 'Music', 'Travel'],
    intent: 'long_term',
    location: 'Cambridge, MA',
    geohash: 'drt2z5',
  },
  {
    hash: 'demo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60018',
    name: 'Tyler Wu',
    age: 24,
    bio: "Landscape photographer and trail runner. I chase golden hour like my life depends on it. Will wake you up at 4 AM for sunrise but I'll have coffee ready. Worth it.",
    bioPrompt: 'perfect_day',
    interests: ['Photography', 'Hiking', 'Coffee', 'Nature'],
    intent: 'not_sure',
    location: 'Boulder, CO',
    geohash: '9xj3d8',
  },
];

// The two profiles that will have mutual matches + messages with the user
const MATCH_PROFILES = [DEMO_PROFILES[0], DEMO_PROFILES[2]]; // Aria Chen, Priya Sharma

// ─── SEEDER ──────────────────────────────────────────────────────────

function buildProfileData(seed: SeedProfile): ProfileData {
  const now = new Date();
  // Stagger created_at so profiles look organic
  const created = new Date(now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000);
  
  return {
    wallet_hash: seed.hash,
    wallet_address: `aleo1demo${seed.hash.slice(-12)}`,
    name: seed.name,
    age: seed.age,
    bio: seed.bio,
    bio_prompt_type: seed.bioPrompt,
    interests: seed.interests,
    dating_intent: seed.intent,
    // DiceBear avatar — unique per name, no external image hosting needed
    profile_image_path: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed.name)}&backgroundColor=c0aede`,
    additional_images: [],
    location_geohash: seed.geohash,
    location_name: seed.location,
    created_at: created.toISOString(),
    updated_at: now.toISOString(),
  };
}

function generateMessages(
  userHash: string,
  matchHash: string,
  matchName: string,
  thread: 'aria' | 'priya'
): any[] {
  const now = Date.now();
  const hour = 3600_000;

  if (thread === 'aria') {
    return [
      {
        id: `seed_msg_001_${matchHash.slice(-6)}`,
        senderId: matchHash,
        recipientId: userHash,
        content: `Hey! I saw we matched 💕 Your profile says you like tech — what are you working on?`,
        timestamp: now - 5 * hour,
        encrypted: true,
        read: true,
      },
      {
        id: `seed_msg_002_${matchHash.slice(-6)}`,
        senderId: userHash,
        recipientId: matchHash,
        content: `Hi Aria! I'm building a privacy-first dating app on Aleo blockchain actually 😄`,
        timestamp: now - 4.5 * hour,
        encrypted: true,
        read: true,
      },
      {
        id: `seed_msg_003_${matchHash.slice(-6)}`,
        senderId: matchHash,
        recipientId: userHash,
        content: `Wait that's so cool! Zero-knowledge proofs for dating? I love the idea of verifying age without revealing your actual birthday.`,
        timestamp: now - 4 * hour,
        encrypted: true,
        read: true,
      },
      {
        id: `seed_msg_004_${matchHash.slice(-6)}`,
        senderId: userHash,
        recipientId: matchHash,
        content: `Exactly! Privacy shouldn't be a luxury. The whole matching system is decentralized too — no central server holding everyone's data.`,
        timestamp: now - 3.5 * hour,
        encrypted: true,
        read: true,
      },
      {
        id: `seed_msg_005_${matchHash.slice(-6)}`,
        senderId: matchHash,
        recipientId: userHash,
        content: `As a designer I really appreciate that. Most apps treat user data like it's theirs. Have you thought about the UX for the ZK verification flow?`,
        timestamp: now - 3 * hour,
        encrypted: true,
        read: true,
      },
      {
        id: `seed_msg_006_${matchHash.slice(-6)}`,
        senderId: userHash,
        recipientId: matchHash,
        content: `Yeah! It's a simple form — just enter your birth year and the proof is generated client-side. No data ever leaves your device 🔐`,
        timestamp: now - 2.5 * hour,
        encrypted: true,
        read: true,
      },
      {
        id: `seed_msg_007_${matchHash.slice(-6)}`,
        senderId: matchHash,
        recipientId: userHash,
        content: `That's really well thought out. Would love to grab coffee sometime and hear more about the architecture! ☕`,
        timestamp: now - 1 * hour,
        encrypted: true,
        read: false,
      },
    ];
  }

  // Priya thread
  return [
    {
      id: `seed_msg_101_${matchHash.slice(-6)}`,
      senderId: userHash,
      recipientId: matchHash,
      content: `Hey Priya! Your bio cracked me up — dopamine explanations at concerts sounds like my kind of fun 😂`,
      timestamp: now - 8 * hour,
      encrypted: true,
      read: true,
    },
    {
      id: `seed_msg_102_${matchHash.slice(-6)}`,
      senderId: matchHash,
      recipientId: userHash,
      content: `Haha glad someone appreciates it! Most people's eyes glaze over when I start talking about reward pathways 🧠`,
      timestamp: now - 7 * hour,
      encrypted: true,
      read: true,
    },
    {
      id: `seed_msg_103_${matchHash.slice(-6)}`,
      senderId: userHash,
      recipientId: matchHash,
      content: `Not mine! I'm genuinely curious — does swiping on dating apps trigger the same dopamine loops as social media?`,
      timestamp: now - 6 * hour,
      encrypted: true,
      read: true,
    },
    {
      id: `seed_msg_104_${matchHash.slice(-6)}`,
      senderId: matchHash,
      recipientId: userHash,
      content: `Oh 100%. Variable ratio reinforcement — you never know when you'll get a match, so you keep swiping. It's literally a slot machine. That's actually why I like that your app uses compatibility scores instead of endless swiping.`,
      timestamp: now - 5.5 * hour,
      encrypted: true,
      read: true,
    },
    {
      id: `seed_msg_105_${matchHash.slice(-6)}`,
      senderId: userHash,
      recipientId: matchHash,
      content: `That means a lot coming from someone who studies this! We also limit daily swipes for free users — intentional friction.`,
      timestamp: now - 4 * hour,
      encrypted: true,
      read: true,
    },
    {
      id: `seed_msg_106_${matchHash.slice(-6)}`,
      senderId: matchHash,
      recipientId: userHash,
      content: `Smart design choice. Anyway, any good bouldering spots you'd recommend? I'm new to the area 🧗‍♀️`,
      timestamp: now - 2 * hour,
      encrypted: true,
      read: false,
    },
  ];
}

/**
 * Seed demo profiles, matches, and messages into localStorage.
 * Idempotent — only runs once per browser.
 * 
 * @param userWalletHash - The current user's wallet_hash (to create mutual matches)
 */
export function seedDemoData(userWalletHash?: string): void {
  if (typeof window === 'undefined') return;

  // Already seeded?
  if (localStorage.getItem(SEED_FLAG)) return;

  console.log('🌱 Seeding demo profiles...');

  // ── 1. Write profiles into both storage layers ────────────────

  const existingIndex: string[] = JSON.parse(localStorage.getItem(PROFILES_INDEX) || '[]');
  const gunProfiles: Record<string, ProfileData> = JSON.parse(
    localStorage.getItem(GUN_PROFILES_KEY) || '{}'
  );

  for (const seed of DEMO_PROFILES) {
    const profile = buildProfileData(seed);

    // profile.ts storage: individual keys + index
    const key = `${PROFILE_PREFIX}${seed.hash}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(profile));
    }
    if (!existingIndex.includes(seed.hash)) {
      existingIndex.push(seed.hash);
    }

    // gun-storage.ts storage: single map
    if (!gunProfiles[seed.hash]) {
      gunProfiles[seed.hash] = profile;
    }
  }

  localStorage.setItem(PROFILES_INDEX, JSON.stringify(existingIndex));
  localStorage.setItem(GUN_PROFILES_KEY, JSON.stringify(gunProfiles));

  console.log(`✅ ${DEMO_PROFILES.length} profiles seeded`);

  // ── 2. Create mutual matches + messages (if user hash known) ──

  if (userWalletHash) {
    const likes: any[] = JSON.parse(localStorage.getItem(LIKES_KEY) || '[]');
    const matches: any[] = JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]');

    for (const matchSeed of MATCH_PROFILES) {
      const matchHash = matchSeed.hash;
      const now = Date.now();

      // Both users "liked" each other
      if (!likes.find((l: any) => l.from === userWalletHash && l.to === matchHash)) {
        likes.push({ from: userWalletHash, to: matchHash, action: 'like', timestamp: now - 86400_000 });
      }
      if (!likes.find((l: any) => l.from === matchHash && l.to === userWalletHash)) {
        likes.push({ from: matchHash, to: userWalletHash, action: 'like', timestamp: now - 82800_000 });
      }

      // Create mutual match record
      const existingMatch = matches.find(
        (m: any) =>
          (m.user1 === userWalletHash && m.user2 === matchHash) ||
          (m.user1 === matchHash && m.user2 === userWalletHash)
      );
      if (!existingMatch) {
        matches.push({
          user1: userWalletHash,
          user2: matchHash,
          timestamp: now - 80000_000,
          compatibilityScore: matchSeed === DEMO_PROFILES[0] ? 87 : 79,
          sharedInterests: matchSeed.interests.slice(0, 2),
        });
      }

      // Seed messages
      const chatKey = `bliss_messages_${[userWalletHash, matchHash].sort().join('_')}`;
      if (!localStorage.getItem(chatKey) || JSON.parse(localStorage.getItem(chatKey)!).length === 0) {
        const thread = matchSeed === DEMO_PROFILES[0] ? 'aria' : 'priya';
        const msgs = generateMessages(userWalletHash, matchHash, matchSeed.name, thread as 'aria' | 'priya');
        localStorage.setItem(chatKey, JSON.stringify(msgs));
      }
    }

    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
    localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
    console.log(`💬 2 mutual matches with messages seeded`);
  }

  // Mark complete
  localStorage.setItem(SEED_FLAG, Date.now().toString());
  console.log('🌱 Demo seeding complete!');
}

/**
 * Remove all demo data (for cleanup)
 */
export function clearDemoData(): void {
  if (typeof window === 'undefined') return;

  const index: string[] = JSON.parse(localStorage.getItem(PROFILES_INDEX) || '[]');
  const gunProfiles: Record<string, ProfileData> = JSON.parse(
    localStorage.getItem(GUN_PROFILES_KEY) || '{}'
  );

  for (const seed of DEMO_PROFILES) {
    // Remove from profile.ts storage
    localStorage.removeItem(`${PROFILE_PREFIX}${seed.hash}`);
    const idx = index.indexOf(seed.hash);
    if (idx !== -1) index.splice(idx, 1);

    // Remove from gun-storage
    delete gunProfiles[seed.hash];
  }

  localStorage.setItem(PROFILES_INDEX, JSON.stringify(index));
  localStorage.setItem(GUN_PROFILES_KEY, JSON.stringify(gunProfiles));
  localStorage.removeItem(SEED_FLAG);

  console.log('🗑️ Demo data cleared');
}
