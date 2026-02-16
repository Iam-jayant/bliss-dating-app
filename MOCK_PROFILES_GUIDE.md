# Mock Profiles Setup Guide

## 🎭 Quick Start

The app automatically seeds 15 mock profiles on first visit, so you should see profiles in the discovery page immediately!

## 📍 Where Profiles Are Stored

Profiles are stored in **browser localStorage** under the key:
```
bliss_profiles_v2
```

## 🛠️ Manual Setup Methods

### Method 1: Browser Console (Instant)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run:
```javascript
blissAdmin.seedMockProfiles(15)
```

### Method 2: Copy-Paste Script
1. Open [setup-dev-profiles.js](./scripts/setup-dev-profiles.js)
2. Copy entire contents
3. Paste into browser console
4. Press Enter

### Method 3: In Development (Auto-loaded)
If you're in development mode, commands are auto-loaded:
```javascript
blissAdmin.help()                 // Show all commands
blissAdmin.seedMockProfiles(10)   // Add 10 profiles
blissAdmin.listAllProfiles()      // List all profiles
blissAdmin.showProfileStats()     // Show statistics
blissAdmin.clearMockProfiles()    // Remove mock profiles
```

## 🎨 Mock Profile Features

Each mock profile includes:
- ✅ Realistic names
- ✅ Varied bio prompts (4 types)
- ✅ 2-4 interests per profile
- ✅ Different dating intents
- ✅ Creation timestamps
- ✅ Some with profile images, some without (realistic)

## 🔍 View Profiles

### In Browser Console
```javascript
// View raw data
localStorage.getItem('bliss_profiles_v2')

// Nicely formatted
JSON.parse(localStorage.getItem('bliss_profiles_v2'))

// Using admin tools
blissAdmin.listAllProfiles()
```

### In Discovery Page
1. Connect your wallet
2. Navigate to `/discovery`
3. See profiles in swipeable card format!

## 🧹 Managing Profiles

### Add More Profiles
```javascript
blissAdmin.seedMockProfiles(20)  // Add 20 more
```

### Clear Only Mock Profiles (Keeps Real Users)
```javascript
blissAdmin.clearMockProfiles()
```

### Clear Everything
```javascript
localStorage.removeItem('bliss_profiles_v2')
```

## 📊 Development Widget

In development mode, you'll see a floating widget in the bottom-right corner:
- Shows total profile count
- Shows mock profile count
- "Add 10" button - adds 10 more mock profiles
- "Clear" button - removes all mock profiles

## 🔧 Profile Structure

Each profile follows this structure:
```typescript
{
  wallet_hash: string,          // Unique identifier
  name: string,                 // User's name
  bio: string,                  // Bio text
  bio_prompt_type: BioPromptType, // Prompt type used
  interests: string[],          // 2-4 interests
  dating_intent: DatingIntent,  // Dating intention
  is_verified: boolean,         // Always true
  created_at: string,           // ISO timestamp
  updated_at: string,           // ISO timestamp
  profile_image_path?: string   // Optional image CID
}
```

## 🚀 Quick Commands Reference

```javascript
// Setup
blissAdmin.seedMockProfiles(15)      // Add profiles
blissAdmin.clearMockProfiles()       // Remove mocks

// View
blissAdmin.listAllProfiles()         // Console list
blissAdmin.showProfileStats()        // Statistics
blissAdmin.exportProfiles()          // Export JSON

// Debug
blissAdmin.getStorageInfo()          // Storage usage
blissAdmin.help()                    // Show help
```

## 💡 Tips

1. **First Time?** - Profiles auto-seed on first visit
2. **Need More?** - Click "Add 10" in the dev widget or use console commands
3. **Testing Flow?** - Create your own profile first, then view others
4. **Clean Slate?** - Use `clearMockProfiles()` to start fresh
5. **Real Data?** - Mock profiles are prefixed with `mock_` in their hash

## 🐛 Troubleshooting

### No Profiles Showing?
1. Check console for errors
2. Verify profiles exist: `localStorage.getItem('bliss_profiles_v2')`
3. Try refreshing the page
4. Manually seed: `blissAdmin.seedMockProfiles(15)`

### Too Many Profiles?
```javascript
blissAdmin.clearMockProfiles()  // Remove mocks only
```

### Need to Reset Everything?
```javascript
localStorage.clear()  // Nuclear option - clears ALL data
location.reload()     // Reload page
```

## 📁 Related Files

- `/src/lib/supabase/mock-profiles.ts` - Mock profile generator
- `/src/lib/supabase/profile-admin.ts` - Admin utilities
- `/src/components/admin/profile-seeder.tsx` - Dev widget
- `/scripts/setup-dev-profiles.js` - Standalone setup script
