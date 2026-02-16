/**
 * Mock profile generator for testing and development
 * Creates realistic profiles for the discovery page
 */

import type { ProfileData, BioPromptType, DatingIntent } from './types';
import { hashWalletAddress } from '../wallet-hash';

const MOCK_NAMES = [
  "Alex Rivera", "Sam Chen", "Jordan Blake", "Riley Parker", "Taylor Morgan",
  "Casey Mitchell", "Drew Anderson", "Quinn Hayes", "Avery Kim", "Morgan Lee",
  "Skylar Thompson", "Dakota Rivers", "Reese Martinez", "Jamie Foster", "Adrian Cole",
  "Sage Bennett", "River Stone", "Phoenix Wright", "Rowan Ellis", "Charlie Davis"
];

const MOCK_BIOS = {
  "Two truths and a lie": [
    "I've surfed in Bali, speak three languages, and I'm a morning person (spoiler: the last one's the lie 😅)",
    "I once lived in a van for a year, I'm a certified yoga instructor, and I hate coffee",
    "I can solve a Rubik's cube in under 2 minutes, I've never broken a bone, and I love horror movies",
    "I've been skydiving twice, I'm a vegetarian, and I've never been outside the country",
    "I'm learning to play the guitar, I've run a marathon, and I'm afraid of heights",
  ],
  "The one thing people get wrong about me": [
    "People think I'm shy, but I'm just observing and deciding if you're worth my energy 😊",
    "Everyone assumes I'm a coffee addict because I'm always at cafes - truth is, I just love the vibe",
    "People mistake my quietness for being boring, but I'm just saving my energy for the right conversations",
    "Most think I'm super extroverted, but I recharge best with a good book and some alone time",
    "People think I'm serious all the time - I just have a dry sense of humor that takes a minute to get",
  ],
  "My perfect Sunday": [
    "Sleeping in, brunch with bottomless mimosas, a long walk in the park, then Netflix with someone special",
    "Early morning hike to catch the sunrise, farmers market haul, cooking something new, movie marathon",
    "Lazy morning in bed, spontaneous road trip to somewhere I've never been, sunset watching",
    "Coffee shop hopping, finding new music, creative project time, dinner with good conversation",
    "Beach day from sunrise to sunset - surfing, reading, beachside tacos, bonfire with friends",
  ],
  "What makes me unique": [
    "I can quote almost any Pixar movie and I'm not ashamed. Also, I make a mean carbonara 👨‍🍳",
    "I collect vintage cameras and actually know how to use them. Plus I bake stress-relief bread",
    "I'm a software engineer who does stand-up comedy on weekends. Balance is key 🎤",
    "I speak 4 languages and can't whistle. The duality of man 🤷",
    "I'm training for a triathlon while building a startup. I don't believe in half-measures",
  ],
};

const INTERESTS_POOL = [
  "Coffee", "Hiking", "Photography", "Cooking", "Travel", "Music", "Yoga", "Reading",
  "Fitness", "Art", "Gaming", "Dancing", "Movies", "Surfing", "Cycling", "Food",
  "Tech", "Fashion", "Writing", "Sports", "Meditation", "Nature", "Concerts", "Theater"
];

const DATING_INTENTS: DatingIntent[] = [
  "Long-term",
  "Short-term", 
  "Friends",
  "Open to explore"
];

/**
 * Generate a random profile
 */
function generateRandomProfile(index: number): ProfileData {
  const name = MOCK_NAMES[index % MOCK_NAMES.length];
  const bioPromptType: BioPromptType = Object.keys(MOCK_BIOS)[index % 4] as BioPromptType;
  const bios = MOCK_BIOS[bioPromptType];
  const bio = bios[index % bios.length];
  
  // Pick 2-4 random interests
  const numInterests = 2 + (index % 3);
  const shuffled = [...INTERESTS_POOL].sort(() => Math.random() - 0.5);
  const interests = shuffled.slice(0, numInterests);
  
  const datingIntent = DATING_INTENTS[index % DATING_INTENTS.length];
  
  // Generate a fake wallet hash for mock profile
  const walletHash = `mock_${index}_${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now().toString(36)}`;
  
  const daysAgo = Math.floor(Math.random() * 30);
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    wallet_hash: walletHash,
    name,
    bio,
    bio_prompt_type: bioPromptType,
    interests,
    dating_intent: datingIntent,
    is_verified: true,
    created_at: createdAt,
    updated_at: createdAt,
    // Some profiles have images, some don't (realistic)
    profile_image_path: index % 3 === 0 ? undefined : `mock_image_${index}`,
  };
}

/**
 * Generate multiple mock profiles
 */
export function generateMockProfiles(count: number = 10): ProfileData[] {
  const profiles: ProfileData[] = [];
  
  for (let i = 0; i < count; i++) {
    profiles.push(generateRandomProfile(i));
  }
  
  return profiles;
}

/**
 * Add mock profiles to localStorage
 * @param count Number of profiles to generate (default 10)
 * @param clear Whether to clear existing profiles first (default false)
 */
export function seedMockProfiles(count: number = 10, clear: boolean = false): void {
  if (typeof window === 'undefined') {
    console.warn('Cannot seed profiles: not in browser environment');
    return;
  }
  
  const PROFILES_KEY = 'bliss_profiles_v2';
  
  // Get existing profiles or start fresh
  let existingProfiles: Record<string, ProfileData> = {};
  
  if (!clear) {
    try {
      const stored = localStorage.getItem(PROFILES_KEY);
      if (stored) {
        existingProfiles = JSON.parse(stored);
      }
    } catch (err) {
      console.error('Error reading existing profiles:', err);
    }
  }
  
  // Generate mock profiles
  const mockProfiles = generateMockProfiles(count);
  
  // Add to storage
  mockProfiles.forEach(profile => {
    existingProfiles[profile.wallet_hash] = profile;
  });
  
  localStorage.setItem(PROFILES_KEY, JSON.stringify(existingProfiles));
  
  console.log(`✅ Added ${count} mock profiles to localStorage`);
  console.log(`📊 Total profiles: ${Object.keys(existingProfiles).length}`);
}

/**
 * Clear all mock profiles (keeps real ones with proper wallet format)
 */
export function clearMockProfiles(): void {
  if (typeof window === 'undefined') {
    console.warn('Cannot clear profiles: not in browser environment');
    return;
  }
  
  const PROFILES_KEY = 'bliss_profiles_v2';
  
  try {
    const stored = localStorage.getItem(PROFILES_KEY);
    if (!stored) return;
    
    const allProfiles: Record<string, ProfileData> = JSON.parse(stored);
    const realProfiles: Record<string, ProfileData> = {};
    
    // Keep only profiles without 'mock_' prefix
    Object.entries(allProfiles).forEach(([hash, profile]) => {
      if (!hash.startsWith('mock_')) {
        realProfiles[hash] = profile;
      }
    });
    
    localStorage.setItem(PROFILES_KEY, JSON.stringify(realProfiles));
    
    const removed = Object.keys(allProfiles).length - Object.keys(realProfiles).length;
    console.log(`🗑️  Removed ${removed} mock profiles`);
    console.log(`📊 Remaining profiles: ${Object.keys(realProfiles).length}`);
  } catch (err) {
    console.error('Error clearing mock profiles:', err);
  }
}

/**
 * Get only mock profiles
 */
export function getMockProfiles(): ProfileData[] {
  if (typeof window === 'undefined') return [];
  
  const PROFILES_KEY = 'bliss_profiles_v2';
  
  try {
    const stored = localStorage.getItem(PROFILES_KEY);
    if (!stored) return [];
    
    const allProfiles: Record<string, ProfileData> = JSON.parse(stored);
    
    return Object.entries(allProfiles)
      .filter(([hash]) => hash.startsWith('mock_'))
      .map(([_, profile]) => profile);
  } catch (err) {
    console.error('Error getting mock profiles:', err);
    return [];
  }
}

// Make functions available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).blissMock = {
    seedMockProfiles,
    clearMockProfiles,
    getMockProfiles,
    help: () => {
      console.log(`
🎭 Bliss Mock Profile Commands:
─────────────────────────────────────────────
Available commands:
  blissMock.seedMockProfiles(10)  - Add 10 mock profiles
  blissMock.seedMockProfiles(20, true) - Replace all with 20 mock profiles
  blissMock.clearMockProfiles()   - Remove all mock profiles
  blissMock.getMockProfiles()     - View all mock profiles
  blissMock.help()                - Show this help
─────────────────────────────────────────────
      `);
    }
  };
  
  console.log('🎭 Mock profiles loaded. Type "blissMock.help()" for commands');
}
