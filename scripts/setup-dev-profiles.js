/**
 * Quick Setup Script for Bliss Development
 * Run this once to populate the app with mock profiles
 * 
 * Usage in browser console:
 * 1. Copy this entire file content
 * 2. Paste into browser console
 * 3. Profiles will be instantly available!
 */

(function() {
  console.log('🚀 Bliss Quick Setup Starting...\n');

  // Check if we're in the browser
  if (typeof window === 'undefined') {
    console.error('❌ This script must be run in a browser console');
    return;
  }

  // Check if profiles already exist
  const existingProfiles = localStorage.getItem('bliss_profiles_v2');
  if (existingProfiles) {
    const count = Object.keys(JSON.parse(existingProfiles)).length;
    console.log(`ℹ️  Found ${count} existing profiles`);
    
    const confirm = window.confirm(
      `Found ${count} existing profiles.\n\nAdd 15 more mock profiles?`
    );
    
    if (!confirm) {
      console.log('Setup cancelled.');
      return;
    }
  }

  // Generate mock profiles
  console.log('📝 Generating mock profiles...');
  
  const mockNames = [
    "Alex Rivera", "Sam Chen", "Jordan Blake", "Riley Parker", "Taylor Morgan",
    "Casey Mitchell", "Drew Anderson", "Quinn Hayes", "Avery Kim", "Morgan Lee",
    "Skylar Thompson", "Dakota Rivers", "Reese Martinez", "Jamie Foster", "Adrian Cole"
  ];

  const mockBios = [
    "I've surfed in Bali, speak three languages, and I'm a morning person (spoiler: the last one's the lie 😅)",
    "People think I'm shy, but I'm just observing and deciding if you're worth my energy 😊",
    "Sleeping in, brunch with bottomless mimosas, a long walk in the park, then Netflix with someone special",
    "I can quote almost any Pixar movie and I'm not ashamed. Also, I make a mean carbonara 👨‍🍳",
    "Early morning hike to catch the sunrise, farmers market haul, cooking something new, movie marathon",
    "People mistake my quietness for being boring, but I'm just saving my energy for the right conversations",
    "Coffee shop hopping, finding new music, creative project time, dinner with good conversation",
    "I collect vintage cameras and actually know how to use them. Plus I bake stress-relief bread",
    "Lazy morning in bed, spontaneous road trip to somewhere I've never been, sunset watching",
    "I'm a software engineer who does stand-up comedy on weekends. Balance is key 🎤",
    "Beach day from sunrise to sunset - surfing, reading, beachside tacos, bonfire with friends",
    "I speak 4 languages and can't whistle. The duality of man 🤷",
    "Most think I'm super extroverted, but I recharge best with a good book and some alone time",
    "I'm training for a triathlon while building a startup. I don't believe in half-measures",
    "Everyone assumes I'm a coffee addict because I'm always at cafes - truth is, I just love the vibe"
  ];

  const interests = [
    "Coffee", "Hiking", "Photography", "Cooking", "Travel", "Music", "Yoga", "Reading",
    "Fitness", "Art", "Gaming", "Dancing", "Movies", "Surfing", "Cycling", "Food"
  ];

  const datingIntents = ["Long-term", "Short-term", "Friends", "Open to explore"];

  const profiles = {};
  
  for (let i = 0; i < 15; i++) {
    const name = mockNames[i];
    const hash = `mock_${i}_${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now().toString(36)}`;
    
    // Pick 2-4 random interests
    const numInterests = 2 + Math.floor(Math.random() * 3);
    const shuffledInterests = [...interests].sort(() => Math.random() - 0.5);
    const selectedInterests = shuffledInterests.slice(0, numInterests);
    
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    
    profiles[hash] = {
      wallet_hash: hash,
      name: name,
      bio: mockBios[i],
      bio_prompt_type: ["Two truths and a lie", "The one thing people get wrong about me", "My perfect Sunday", "What makes me unique"][i % 4],
      interests: selectedInterests,
      dating_intent: datingIntents[i % 4],
      is_verified: true,
      created_at: createdAt,
      updated_at: createdAt,
      profile_image_path: i % 3 === 0 ? undefined : `mock_image_${i}`
    };
  }

  // Save to localStorage
  const existing = existingProfiles ? JSON.parse(existingProfiles) : {};
  const merged = { ...existing, ...profiles };
  localStorage.setItem('bliss_profiles_v2', JSON.stringify(merged));

  const totalCount = Object.keys(merged).length;
  
  console.log('✅ Setup Complete!\n');
  console.log(`📊 Total Profiles: ${totalCount}`);
  console.log(`🎭 Mock Profiles Added: 15`);
  console.log('\n💡 Refresh the page to see profiles in the discovery feed!');
  console.log('\n🔧 Additional Commands:');
  console.log('  • blissAdmin.listAllProfiles() - View all profiles');
  console.log('  • blissAdmin.showProfileStats() - Show statistics');
  console.log('  • blissAdmin.clearMockProfiles() - Remove mock profiles');
  
  // Prompt to refresh
  if (window.confirm('Setup complete! Refresh the page now?')) {
    window.location.reload();
  }
})();
