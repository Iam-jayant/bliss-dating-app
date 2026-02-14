# ✨ Pinata Setup Guide (Free IPFS Storage)

## Why Pinata?
- **100% FREE** - No credit card required
- **1GB Storage** - Perfect for development
- **Fast Gateways** - Faster than public IPFS gateways
- **Easy Setup** - 5 minutes to get started

---

## Step-by-Step Setup

### 1. Create Pinata Account (2 minutes)
1. Go to https://app.pinata.cloud/
2. Click "Sign Up" (top right)
3. Enter email and create password
4. Verify your email
5. **That's it - no credit card needed!**

### 2. Get Your API Key (2 minutes)
1. Log into Pinata dashboard
2. Click "API Keys" in left sidebar
3. Click "+ New Key" button
4. **Configure permissions:**
   - ✅ Enable "pinFileToIPFS"
   - ✅ Enable "unpin" (optional, for cleanup)
   - Name: "Bliss Dating App"
5. Click "Generate Key"
6. **Copy the JWT token** (you'll only see this once!)

### 3. Add to Your Project (1 minute)
1. Open your project folder
2. Create `.env.local` file (or edit existing)
3. Add these lines:
   ```env
   NEXT_PUBLIC_PINATA_JWT=eyJhbGci0iJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_PINATA_GATEWAY=gateway.pinata.cloud
   ```
4. Replace the JWT with your actual token from step 2

---

## Installation

```bash
# Install axios (for Pinata API calls)
npm install axios

# Or if you prefer yarn
yarn add axios
```

---

## Usage Example

```typescript
import { pinataStorage } from '@/lib/storage/pinata-storage';

// Initialize
await pinataStorage.initialize();

// Test connection
const isConnected = await pinataStorage.testConnection();
console.log('Pinata connected:', isConnected);

// Upload profile
const cid = await pinataStorage.storeProfile(
  profileData,
  walletAddress,
  walletSignature
);

// Retrieve profile
const profile = await pinataStorage.retrieveProfile(
  cid,
  walletAddress,
  walletSignature
);

// Upload image
const imageCid = await pinataStorage.uploadImage(file, walletAddress);

// Get image URL
const imageUrl = pinataStorage.getImageUrl(imageCid);
// Example: https://gateway.pinata.cloud/ipfs/QmXyz...
```

---

## Free Tier Limits

| Feature | Free Tier | Notes |
|---------|-----------|-------|
| Storage | 1GB | ~10,000 profiles |
| Bandwidth | Unlimited | No throttling |
| Requests | Unlimited | No rate limits |
| Gateways | Unlimited | Fast retrieval |
| Files | Unlimited | Any file type |
| Duration | Forever | No expiration |

**Perfect for:**
- ✅ Development & testing
- ✅ Wave 2 submission demo
- ✅ Small-scale MVP
- ✅ Proof of concept

---

## Features Used in Bliss

### Profile Storage
- **Encrypted with wallet signature**
- **Stored as JSON on IPFS**
- **CID stored on-chain** (Aleo blockchain)
- **Client-side encryption** (AES-GCM)

### Image Storage
- **Profile pictures** → IPFS
- **Additional photos** → IPFS
- **Fast retrieval** via Pinata gateway
- **Content addressing** (immutable)

### Privacy
- ✅ Data encrypted before upload
- ✅ Only owner can decrypt (wallet signature)
- ✅ IPFS = decentralized (no single point of failure)
- ✅ Pinata doesn't see plaintext data

---

## Troubleshooting

### "Pinata JWT not configured" Error
**Fix:** Make sure `.env.local` exists and contains your JWT token.

### "Failed to fetch from IPFS" Error
**Fix:** CID might be newly uploaded. Wait 10-30 seconds for propagation.

### "Authorization failed" Error
**Fix:** Your JWT token expired or is invalid. Generate a new one in Pinata dashboard.

### Upload is slow
**Fix:** Large files take time. Compress images before upload:
```typescript
// Compress image before upload
const compressedFile = await compressImage(file, { maxWidth: 1024 });
const cid = await pinataStorage.uploadImage(compressedFile);
```

---

## Testing Your Setup

```bash
# Start dev server
npm run dev

# In browser console:
const storage = await import('./src/lib/storage/pinata-storage');
await storage.pinataStorage.initialize();
const isConnected = await storage.pinataStorage.testConnection();
console.log('Connection:', isConnected);
// Should log: ✅ Pinata connection successful
```

---

## Comparison: Pinata vs Web3.Storage

| Feature | Pinata | Web3.Storage |
|---------|--------|--------------|
| Free Tier | 1GB | 5TB |
| Signup | Email only | Credit card required |
| Speed | Fast (dedicated gateways) | Variable |
| Reliability | 99.9% uptime | 99% uptime |
| API | REST | JavaScript SDK |
| Best For | Quick start, dev | Production, scale |

**For Bliss Wave 2:** Pinata is perfect! Free, fast, and no barriers to entry.

---

## Next Steps

1. ✅ Sign up for Pinata
2. ✅ Get your JWT token
3. ✅ Add to `.env.local`
4. ✅ Run `npm install axios`
5. ✅ Test with `npm run dev`
6. 🚀 Start building!

---

## Resources

- **Pinata Docs:** https://docs.pinata.cloud/
- **IPFS Docs:** https://docs.ipfs.tech/
- **Bliss Storage Service:** `src/lib/storage/pinata-storage.ts`
- **Support:** Open an issue on GitHub

---

**Happy building! 💜**

*No credit card. No tricks. Just free, decentralized storage for your privacy-first dating app.*
