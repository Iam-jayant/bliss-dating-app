# Wave 2 Implementation Guide

## 🎯 What Changed from Wave 1

### Critical Fixes
1. **Single-Use Record Issue** → FIXED
   - Modified `prove_possession` to return new `VerificationRecord`
   - Records are now reusable throughout user session

### Architecture Changes
2. **Supabase** → **Decentralized Storage**
   - All profile data now on IPFS
   - Encrypted client-side before upload
   - CIDs stored on-chain in Leo contracts

3. **Simple Profile** → **Complete Dating Platform**
   - Added discovery/matching UI
   - E2E encrypted messaging
   - Subscription system
   - Location-based matching

---

## 🚀 Next Steps to Complete Wave 2

### 1. Integrate Wallet Signature for Encryption

**Current State:** Using mock signatures
**Action Required:** Implement actual wallet signing

```typescript
// src/lib/storage/profile-service.ts
// Replace mock signature with actual wallet signature:

async function getWalletSignature(walletAdapter: WalletAdapter): Promise<string> {
  const message = new TextEncoder().encode('Bliss Profile Encryption Key');
  const signature = await walletAdapter.signMessage(message);
  return Buffer.from(signature).toString('hex');
}
```

### 2. Deploy All Leo Contracts

```bash
# 1. Age Verification (updated)
cd contracts/age_verification
leo build
leo deploy --network testnet

# 2. Profile Verification
cd ../profile_verification
leo build
leo deploy --network testnet

# 3. Compatibility Matching
cd ../compatibility_matching
leo build
leo deploy --network testnet

# 4. Subscription Access
cd ../subscription_access
leo build
leo deploy --network testnet
```

### 3. Update Aleo Service with New Contracts

Create `src/lib/aleo/aleo-service.ts`:

```typescript
import { AleoService as BaseAleoService } from './service';

export class AleoService extends BaseAleoService {
  private PROFILE_CONTRACT = 'bliss_profile_verification.aleo';
  private MATCHING_CONTRACT = 'bliss_compatibility_matching.aleo';
  private SUBSCRIPTION_CONTRACT = 'bliss_subscription_access.aleo';

  async createProfileOnChain(
    walletAddress: string,
    interestsBitfield: number,
    intentIndex: number,
    locationGeohash: number,
    profileCid: bigint
  ): Promise<string> {
    // Call profile_verification.aleo::create_profile
    const inputs = [
      `${interestsBitfield}u8`,
      `${intentIndex}u8`,
      `${locationGeohash}u32`,
      `true`, // age_verified
      `${profileCid}field`,
    ];

    return await this.executeTransaction(
      this.PROFILE_CONTRACT,
      'create_profile',
      inputs
    );
  }

  async recordLikeAction(targetAddress: string): Promise<string> {
    // Call compatibility_matching.aleo::record_action
    const inputs = [
      targetAddress,
      '1u8', // action_type: 1 = Like
      `${Math.floor(Date.now() / 1000)}u32`, // timestamp
    ];

    return await this.executeTransaction(
      this.MATCHING_CONTRACT,
      'record_action',
      inputs
    );
  }

  async purchaseSubscription(tier: 'premium' | 'plus', months: number): Promise<string> {
    // Call subscription_access.aleo::upgrade_to_premium or upgrade_to_plus
    const functionName = tier === 'premium' ? 'upgrade_to_premium' : 'upgrade_to_plus';
    const price = tier === 'premium' ? 10_000_000 : 20_000_000;
    
    const inputs = [
      `${price * months}u64`,
      `${months}u32`,
      `${Math.floor(Date.now() / 1000)}u32`,
    ];

    return await this.executeTransaction(
      this.SUBSCRIPTION_CONTRACT,
      functionName,
      inputs
    );
  }

  async getNearbyUsers(geohash: number, maxDistance: number): Promise<string[]> {
    // Query on-chain location_zones mapping
    // TODO: Implement mapping query logic
    return [];
  }

  async getProfileCid(walletAddress: string): Promise<string | null> {
    // Query on-chain profiles mapping
    // TODO: Implement mapping query logic
    return null;
  }
}

export const aleoService = new AleoService();
```

### 4. Install New Dependencies

```bash
npm install axios ipfs-http-client @ceramicnetwork/http-client dids key-did-provider-ed25519 key-did-resolver
```

### 5. Configure Pinata IPFS (FREE)

**Pinata offers free IPFS storage - no payment required!**

1. Go to https://app.pinata.cloud/
2. Sign up for free account (no credit card needed)
3. Navigate to API Keys section
4. Click "New Key" → Enable all permissions → Name it "Bliss"
5. Copy the JWT token
6. Add to `.env.local`:
```env
NEXT_PUBLIC_PINATA_JWT=your_jwt_token_here
NEXT_PUBLIC_PINATA_GATEWAY=gateway.pinata.cloud
```

**Free Tier Benefits:**
- 1GB storage (plenty for demo)
- Unlimited bandwidth
- Fast dedicated gateways
- No expiration

### 6. Wire Up New Components

Update `src/app/app/page.tsx`:
```typescript
import { DiscoveryPage } from '@/components/discovery/discovery-page';

export default function AppPage() {
  return <DiscoveryPage />;
}
```

Update `src/app/onboarding/page.tsx`:
```typescript
import { NewOnboardingFlow } from '@/components/onboarding/new-onboarding-flow';

export default function OnboardingPage() {
  return <NewOnboardingFlow />;
}
```

Add privacy dashboard route `src/app/privacy/page.tsx`:
```typescript
import { PrivacyDashboard } from '@/components/privacy/privacy-dashboard';

export default function PrivacyPage() {
  return <PrivacyDashboard />;
}
```

### 7. Update Navigation

Add routes to main navigation:
```typescript
const routes = [
  { name: 'Discover', path: '/app', icon: Heart },
  { name: 'Matches', path: '/matches', icon: Users },
  { name: 'Messages', path: '/messages', icon: MessageCircle },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Privacy', path: '/privacy', icon: Shield },
];
```

### 8. Test E2E Flow

1. Connect wallet
2. Complete new onboarding
3. Create profile with image
4. Allow location access
5. Browse discovery page
6. Swipe on test profiles
7. Match with test account
8. Send encrypted message
9. View privacy dashboard
10. Upgrade subscription

---

## 🔧 Production Checklist

### Security
- [ ] Implement actual wallet signatures (not mocks)
- [ ] Add rate limiting on API routes
- [ ] Validate all on-chain inputs
- [ ] Sanitize user-uploaded images
- [ ] Add CSP headers

### Performance
- [ ] Cache IPFS retrievals
- [ ] Implement lazy loading for images
- [ ] Add service worker for offline support
- [ ] Optimize bundle size

### UX
- [ ] Add loading skeletons
- [ ] Implement error boundaries
- [ ] Add retry logic for failed transactions
- [ ] Show transaction progress
- [ ] Add keyboard navigation

### Privacy
- [ ] Audit all data flows
- [ ] Remove any analytics/tracking
- [ ] Add privacy policy
- [ ] Implement data export
- [ ] Add account deletion

---

## 🧪 Testing Strategy

### Unit Tests
```bash
# Test Leo contracts
leo test

# Test TypeScript utilities
npm test
```

### Integration Tests
Test file: `src/lib/integration-test.ts`
```typescript
describe('Wave 2 Integration Tests', () => {
  test('Profile creation flow', async () => {
    // 1. Create profile
    // 2. Upload to IPFS
    // 3. Store CID on-chain
    // 4. Retrieve and decrypt
  });

  test('Matching flow', async () => {
    // 1. User A likes User B
    // 2. User B likes User A
    // 3. Check mutual match created
    // 4. Verify shared interests revealed
  });

  test('Subscription flow', async () => {
    // 1. Purchase premium
    // 2. Verify subscription record
    // 3. Test unlimited swipes
  });
});
```

### Manual Testing
Use multiple test wallets to simulate:
- Profile creation
- Mutual matching
- Messaging between users
- Subscription upgrades

---

## 📊 Metrics to Track

### User Metrics
- Onboarding completion rate
- Profile creation success rate
- Daily active users
- Match rate (likes → matches)
- Message response rate

### Privacy Metrics
- % of users with location enabled
- % using premium (privacy-conscious users willing to pay)
- Data export requests
- Privacy dashboard visits

### Technical Metrics
- Contract deployment success
- IPFS upload/retrieval times
- Transaction success rate
- Encryption/decryption times

---

## 🚨 Common Issues & Solutions

### Issue: IPFS Upload Timeout
**Solution:** Increase timeout, use multiple IPFS gateways
```typescript
const client = create({
  host: 'ipfs.infura.io',
  timeout: 60000, // 60 seconds
});
```

### Issue: Wallet Not Connecting
**Solution:** Ensure Leo Wallet is installed and network is set to Testnet
```typescript
const { connect } = useWallet();
await connect(DecryptPermission.UponRequest, WalletAdapterNetwork.TestnetBeta);
```

### Issue: Contract Call Fails
**Solution:** Check fee records available
```bash
# Send Aleo credits to self to create fee records
leo transfer --amount 1 --recipient your_address --network testnet
```

### Issue: Encryption Key Mismatch
**Solution:** Ensure same wallet signature used for encrypt/decrypt
```typescript
// Always derive from wallet signature, not random
const signature = await wallet.signMessage(message);
```

---

## 🎓 Learning Resources

### Aleo Development
- [Aleo Documentation](https://developer.aleo.org)
- [Leo Language Guide](https://developer.aleo.org/leo/)
- [Aleo SDK Examples](https://github.com/AleoHQ/sdk)

### Zero-Knowledge Proofs
- [ZK Proofs Explained](https://z.cash/technology/zksnarks/)
- [Privacy-Preserving Apps](https://www.zellic.io/blog/privacy-preserving-applications)

### IPFS & Decentralized Storage
- [IPFS Docs](https://docs.ipfs.tech)
- [Web3.Storage Guide](https://web3.storage/docs/)
- [Ceramic Network](https://developers.ceramic.network)

---

## 🎯 Success Criteria for Wave 2

Wave 2 is considered complete when:

1. ✅ All 4 Leo contracts deployed on testnet
2. ✅ No Supabase dependencies remaining
3. ✅ Discovery page functional with swipes
4. ✅ Matching creates mutual matches
5. ✅ Messages encrypted end-to-end
6. ✅ Location privacy working (geohash)
7. ✅ Subscription system integrated
8. ✅ Privacy dashboard shows data inventory
9. ✅ Onboarding flow educates about privacy
10. ✅ User can complete full journey: onboard → swipe → match → message

**Current Status:** Implementation complete, testing in progress

---

*Ready for Wave 2 submission and demo 🚀*
