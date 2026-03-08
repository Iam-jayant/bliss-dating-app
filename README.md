<p align="center">
  <img src="public/bliss-logo.png" alt="Bliss" width="120" />
</p>

<h1 align="center">Bliss</h1>
<p align="center"><strong>Privacy-first dating, powered by zero-knowledge proofs on Aleo</strong></p>

<p align="center">
  <a href="https://bliss-dating.vercel.app"><strong>Live Site</strong></a> · <a href="https://youtu.be/tQ06a9bLeZc"><strong>Demo Video</strong></a>
</p>

<p align="center">
  <a href="#overview">Overview</a> · <a href="#architecture">Architecture</a> · <a href="#smart-contracts">Smart Contracts</a> · <a href="#privacy-model">Privacy Model</a> · <a href="#payment-system">Payment System</a> · <a href="#getting-started">Getting Started</a>
</p>

---

## Overview

Bliss is a **decentralized dating application** built on [Aleo](https://aleo.org). It replaces the surveillance model of traditional dating apps with a **local-first, cryptographically private** architecture — your data never leaves your device, your age is verified via zero-knowledge proofs, and your messages are end-to-end encrypted peer-to-peer.

| What | How |
|------|-----|
| **Identity** | Wallet-based auth via Shield / Leo / Puzzle — no email, phone, or password |
| **Age verification** | ZK proof on Aleo — age confirmed without revealing birthdate |
| **Profile storage** | Local-first + IPFS (Pinata) + Gun.js P2P sync |
| **Messaging** | E2E encrypted via Gun.js with RSA-OAEP + AES-GCM |
| **Matching** | Bitfield-based compatibility scored both locally and on-chain |
| **Payments** | Private ARC-20 USDC via `transfer_private` — never visible on the public ledger |

> **Status:** Core experience complete on Aleo Testnet. Four smart contracts deployed. Hosted on Vercel.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     USER DEVICE (Source of Truth)                    │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐   │
│  │ localStorage  │   │  Web Crypto  │   │   Bliss App           │   │
│  │  Profiles     │   │  RSA-OAEP    │   │   Next.js 15          │   │
│  │  Matches      │   │  AES-GCM     │   │   App Router          │   │
│  │  Usage cache  │   │  SHA-256     │   │   Provable SDK        │   │
│  └──────┬────────┘   └──────┬───────┘   └───────────┬───────────┘   │
└─────────┼──────────────────┼────────────────────────┼───────────────┘
          │                  │                        │
    ┌─────┼──────────────────┼────────────────────────┼─────────┐
    │     ▼                  ▼                        ▼         │
    │  ┌────────┐     ┌──────────┐     ┌───────────────────┐    │
    │  │Gun.js  │     │ Pinata   │     │  Aleo Blockchain  │    │
    │  │P2P Mesh│     │ IPFS     │     │  (Testnet)        │    │
    │  │        │     │          │     │                   │    │
    │  │Profile │     │ Images   │     │ Age Verification  │    │
    │  │sync    │     │ (IPFS)   │     │ Profile Records   │    │
    │  │E2E msgs│     │ Profiles │     │ Match Records     │    │
    │  │Likes   │     │ (AES-GCM)│     │ Subscription Tiers│    │
    │  └────────┘     └──────────┘     └───────────────────┘    │
    │                                                           │
    │              EXTERNAL SERVICES (No central DB)            │
    └───────────────────────────────────────────────────────────┘
```

**No central server stores user data.** The app is local-first — works offline and syncs when connected.

### Data Flow

```
User A                                                User B
  │                                                     │
  │  ┌─────────────┐     ┌──────────┐     ┌──────────┐ │
  ├─▶│ RSA + AES   │────▶│ Gun.js   │────▶│ Decrypt  │─┤
  │  │ Encrypt msg │     │ P2P relay│     │ (RSA+AES)│ │
  │  └─────────────┘     └──────────┘     └──────────┘ │
  │                                                     │
  │      ┌──────────────────────────────────────┐       │
  └─────▶│         Aleo Blockchain              │◀──────┘
         │                                      │
         │  verify_age()    → VerificationRecord│
         │  record_action() → MatchRecord       │
         │  create_mutual() → MutualMatchRecord │
         │  transfer_private → USDC payment     │
         └──────────────────────────────────────┘
```

### User Journey

```
Connect Wallet ──▶ ZK Age Proof ──▶ Create Profile ──▶ Discovery ──▶ Match ──▶ E2E Chat
     │                  │                 │                │           │          │
  (Shield/Leo,     (prove ≥18,       (photos to       (swipe,     (mutual    (RSA-OAEP
   no email)       birthdate          IPFS, data       compat      like →     + AES-GCM
                   never              AES-encrypted    scored      on-chain   via Gun.js
                   revealed)          locally)         locally)    record)    P2P)
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 15 (App Router, Turbopack) | SSR, routing, API layer |
| **Language** | TypeScript, React 18 | Type-safe components |
| **Blockchain** | Aleo (Leo language), Provable SDK 0.9.15 | ZK proofs, on-chain state |
| **Wallets** | Shield (primary), Leo, Puzzle, Fox, Soter | Wallet auth + tx signing |
| **Token** | ARC-20 USDC on `token_registry.aleo` | Private payment transfers |
| **UI** | Tailwind CSS 3.4, shadcn/ui (Radix), Framer Motion | Dark glassmorphic design |
| **P2P** | Gun.js | Real-time sync, encrypted message relay |
| **IPFS** | Pinata | Profile image + encrypted data storage |
| **Encryption** | Web Crypto API (RSA-OAEP, AES-GCM, SHA-256, PBKDF2) | E2E encryption, identity hashing |
| **3D** | Three.js | Landing page visuals |
| **Hosting** | Vercel | Serverless deployment |

---

## Smart Contracts

Four Leo contracts deployed on **Aleo Testnet**:

| Contract | Program ID | Tx Hash |
|----------|-----------|---------|
| **Age Verification** | `bliss_age_verification_v2.aleo` | [`at1dk3x…e3lvps`](https://explorer.provable.com/transaction/at1dk3xsjqansftu2ug4g89ghya748ufq05nyp5hxjtflw660e3lvpsks47k4) |
| **Profile Verification** | `bliss_profile_verification.aleo` | [`at1jzv8…yq5z5v`](https://explorer.provable.com/transaction/at1jzv8h7fcna6ye5r67nxy0fpsmguf89y3kx0amrg3nerv9y2rsvyqyq5z5v) |
| **Compatibility Matching** | `bliss_compatibility_matching.aleo` | [`at1ymc3…7dcs27`](https://explorer.provable.com/transaction/at1ymc37c2tp4yd2yd6ctmjq3vauhhx4xxpgjxa3eg57hh27dgxcupq7dcs27) |
| **Subscription Access** | `bliss_subscription_access.aleo` | [`at159y8…mdg5gz`](https://explorer.provable.com/transaction/at159y8mclk8l7m2ezcspf5ygg4astrpw346evl2cxyn4a76spcjqgqmdg5gz) |

### 1. Age Verification

Proves a user is 18+ without revealing their birthdate. Issues a reusable private `VerificationRecord`.

```leo
program bliss_age_verification_v2.aleo {

    record VerificationRecord {
        owner: address,
        verified: bool,
    }

    transition verify_age(private age: u8) -> VerificationRecord {
        assert(age >= 18u8);
        return VerificationRecord { owner: self.caller, verified: true };
    }

    transition prove_possession(
        private verification_record: VerificationRecord
    ) -> (bool, VerificationRecord) {
        assert_eq(verification_record.owner, self.caller);
        assert_eq(verification_record.verified, true);
        return (true, VerificationRecord { owner: self.caller, verified: true });
    }
}
```

**How it works:** The user submits their age as a private input. The Aleo runtime generates a ZK-SNARK proving `age >= 18` without revealing the value. The resulting `VerificationRecord` is a private on-chain record — only the owner can see it. `prove_possession` lets the user re-prove their status later without consuming the record.

### 2. Profile Verification

Stores profile metadata on-chain as a private record. All fields are private — no one except the owner can read them.

```leo
program bliss_profile_verification.aleo {

    record ProfileRecord {
        owner: address,
        interests_bitfield: u8,   // 8 interest categories as bits
        dating_intent: u8,        // 0-3 (casual, serious, etc.)
        location_geohash: u32,    // ~5km privacy precision
        age_verified: bool,       // Must be true to create
        premium_tier: u8,         // 0=Free, 1=Premium, 2=Plus
        profile_data_cid: field,  // IPFS CID for encrypted profile
    }

    transition create_profile(
        private interests: u8, private intent: u8,
        private geohash: u32, private age_verified: bool,
        private profile_cid: field,
    ) -> ProfileRecord { ... }

    transition update_profile(
        private old_profile: ProfileRecord,
        private new_interests: u8, private new_intent: u8,
        private new_geohash: u32, private new_profile_cid: field,
    ) -> ProfileRecord { ... }
}
```

### 3. Compatibility Matching

Records swipe actions and creates mutual matches with on-chain compatibility scoring using bitwise operations.

```leo
program bliss_compatibility_matching.aleo {

    record MatchRecord {
        owner: address,
        target: address,
        action: u8,           // 0=Pass, 1=Like, 2=SuperLike
        timestamp: u32,
    }

    record MutualMatchRecord {
        owner: address,
        matched_with: address,
        shared_interests: u8,
        compatibility_score: u8,  // 0-100
        timestamp: u32,
    }

    transition record_action(
        private target_user: address,
        private action_type: u8,
        private current_time: u32,
    ) -> MatchRecord { ... }

    transition create_mutual_match(
        private my_interests: u8, private their_interests: u8,
        private my_match_record: MatchRecord,
        private their_match_record: MatchRecord,
    ) -> MutualMatchRecord { ... }

    inline count_bits(bitfield: u8) -> u8 { ... }
    inline compute_score(shared: u8) -> u8 { ... }
}
```

**Scoring algorithm** (runs identically on-chain and locally):
1. Encode interests as bits in a `u8` bitfield
2. Shared interests = `bitwise AND` of both bitfields
3. Count set bits → score: 4+ shared → 100%, 3 → 75%, 2 → 50%, 1 → 25%, 0 → 0%

The local TypeScript engine extends this with 24-bit `u32` encoding and dating intent weighting (±10-30%).

### 4. Subscription Access

Manages subscription tiers with daily usage limits tracked in private records.

```leo
program bliss_subscription_access.aleo {

    record SubscriptionRecord {
        owner: address,
        tier: u8,               // 0=Free, 1=Premium, 2=Plus
        expires_at: u32,        // Lifetime for paid tiers
        daily_swipe_limit: u32, // 0=unlimited
        max_active_chats: u32,  // 0=unlimited
    }

    record UsageRecord {
        owner: address,
        date: u32,              // YYYYMMDD — auto-resets daily
        swipes_used: u32,
        active_chats: u32,
    }

    const FREE_DAILY_SWIPES: u32 = 10u32;
    const FREE_MAX_CHATS: u32 = 3u32;

    transition create_free_subscription() -> SubscriptionRecord { ... }
    transition upgrade_to_premium(...) -> SubscriptionRecord { ... }
    transition upgrade_to_plus(...) -> SubscriptionRecord { ... }
    transition create_usage_tracker(private current_date: u32) -> UsageRecord { ... }
    transition record_swipe(...) -> (SubscriptionRecord, UsageRecord) { ... }
}
```

---

## Privacy Model

### Comparison with Traditional Dating Apps

| | Traditional Apps | Bliss |
|-|-----------------|-------|
| **Identity** | Email + phone + real name | Wallet address (SHA-256 hashed) |
| **Age check** | ID upload stored in a database | ZK proof — mathematically verified, never stored |
| **Swipe data** | Logged and sold to advertisers | Stored locally, never leaves your device |
| **Messages** | Readable by the company's servers | E2E encrypted (RSA-OAEP 2048 + AES-GCM) |
| **Payments** | Credit card → bank → traceable | Private ARC-20 USDC (`transfer_private`) |
| **Data ownership** | Locked behind the platform | Full export or delete from Settings |
| **Source code** | Closed | Open-source contracts auditable on-chain |

### Encryption Stack

| Operation | Algorithm | Details |
|-----------|-----------|---------|
| **Identity hashing** | SHA-256 | Wallet address → deterministic anonymous ID |
| **Message key exchange** | RSA-OAEP 2048-bit | Per-user keypair generated on-device |
| **Message encryption** | AES-GCM 256-bit | Per-message random IV, authenticated encryption |
| **IPFS data encryption** | AES-GCM + PBKDF2 | Key derived from wallet signature (100k iterations, SHA-256) |
| **Profile sync encryption** | AES-GCM | Wallet hash as encryption key for Gun.js P2P data |
| **Age verification** | ZK-SNARK (Aleo/Marlin) | Proves `age >= 18` without revealing the value |
| **Payment privacy** | `transfer_private` | ARC-20 token transfer — no public ledger trace |

### Storage Model

```
localStorage (primary)   →   Fast offline reads/writes
        │
        ├── Gun.js P2P   →   Cross-device sync (encrypted with wallet hash)
        ├── Pinata IPFS   →   Profile images + AES-GCM encrypted profile JSON
        └── Aleo chain    →   Verification records, match records, subscriptions
```

No central server stores user data. Everything is either on-device, peer-to-peer, or on-chain as private records.

---

## Payment System

### ARC-20 Private USDC

All payments use the ARC-20 token standard on Aleo via `transfer_private`. Payment transactions are **never visible on the public ledger** — only the sender and receiver know about them.

```
ARC-20 Configuration:
  Token Program:  token_registry.aleo
  Token ID:       3443843282313283355522573239085696902919850365217539366784739393210722344986field
  Decimals:       6 (micro-USDC)
  Network Fee:    500,000 microcredits (paid privately)
```

### Subscription Tiers

| Tier | Price | Daily Swipes | Super Likes | See Likes | Boost | Chats |
|------|-------|-------------|-------------|-----------|-------|-------|
| **Free** | $0 | 10 | 0 | No | No | 3 |
| **Premium** | $9.99 | Unlimited | 5/day | Yes | No | Unlimited |
| **Plus** | $19.99 | Unlimited | Unlimited | Yes | Yes | Unlimited |

### Purchase Flow

```
1. findPrivateTokenRecord()
   ├── Fetch wallet records from token_registry.aleo
   ├── Filter by USDC token ID (handles "12345u64.private" encoding)
   ├── Sort by amount descending, pick best-fit record
   └── Throw if no record with sufficient balance

2. transfer_private
   ├── Inputs: [tokenRecord.plaintext, TREASURY_ADDRESS, amount]
   ├── Fee: 500,000 microcredits (privateFee: true)
   └── Execute via wallet adapter

3. Poll confirmation
   ├── Up to 60 attempts at 2-second intervals (~2 min max)
   ├── Handle pending / failed / rejected states
   └── Return confirmed transaction hash

4. Activate subscription
   ├── Execute on-chain: create_subscription (tier 1u8) or upgrade_subscription (tier 2u8)
   └── Cache to localStorage: { tier, txHash, activatedAt }
```

### X-402 Pay-Per-Use Micro-Transactions

The `useX402Payment` hook provides a React interface for individual premium actions (Super Likes, DM unlocks, priority placement). Uses the same private `transfer_private` pipeline:

```
Status lifecycle:  idle → finding-record → awaiting-signature → broadcasting → confirming → confirmed
                                                                                    └── error (at any stage)

Exports:
  pay(actionCost, memo?)  →  Execute a private micro-payment
  status                  →  Current stage of the payment lifecycle
  isProcessing            →  Boolean shorthand for active stages
  result                  →  { transactionId, amountMicro } on success
  reset()                 →  Return to idle state
```

Guards: prevents double-firing via `inflightRef`, validates wallet connection, requires `actionCost > 0`.

---

## Features

### Core
- **Zero-Knowledge Age Verification** — Prove 18+ on Aleo, receive reusable `VerificationRecord`
- **Swipe-Based Discovery** — Card UI with like, pass, super-like, undo. Compatibility scored locally from 24 interest categories
- **Mutual Match System** — Both users must like each other before messaging unlocks
- **E2E Encrypted Chat** — RSA-OAEP key exchange + AES-GCM per-message, relayed via Gun.js P2P
- **Decentralized Storage** — IPFS (Pinata) for images, Gun.js for sync, localStorage for offline
- **Privacy-Preserving Location** — Geohash at configurable precision: city (~20km), neighborhood (~2.4km), block (~610m)

### Premium
- **Subscription Dashboard** — Glassmorphic Web3 billing portal with active plan, feature access, usage tracking
- **X-402 Balance** — Pre-approved USDC for micro-transactions with auto-refill threshold
- **Private Payments** — ARC-20 USDC via `transfer_private`, ZK-SNARK verified tier status

### UI/UX
- **Floating Dock Navigation** — Glassmorphic pill (`bg-black/40 backdrop-blur-xl`) with icon zoom on hover and pink→purple gradient active state
- **Dark Glassmorphism** — Pure black backgrounds, blurred glow blobs, neon pink/purple accents
- **Mobile-first** — Responsive design, drag-to-swipe gestures on discovery cards
- **Typography** — Geist Sans (body) + Instrument Serif (headlines), shadcn/ui component system
- **Animations** — Framer Motion micro-interactions, Three.js landing visuals

---

## Project Structure

```
bliss/
├── contracts/                          # Aleo smart contracts (Leo)
│   ├── age_verification/               # ZK age proof
│   ├── profile_verification/           # Private profile records
│   ├── compatibility_matching/         # Private match + scoring
│   └── subscription_access/            # Tier management + usage limits
├── src/
│   ├── app/                            # Next.js App Router pages
│   │   ├── page.tsx                    # Landing page
│   │   ├── onboarding/                 # Wallet → age verify → profile setup
│   │   ├── discovery/                  # Swipe-based discovery
│   │   ├── likes/                      # Who liked you (premium)
│   │   ├── matches/                    # Mutual matches
│   │   ├── messages/                   # E2E encrypted chat
│   │   ├── profile/                    # View / edit profile
│   │   ├── subscription/               # Subscription management
│   │   ├── settings/                   # Settings + data export / delete
│   │   │   └── subscription/           # Premium billing dashboard
│   │   └── safety/                     # Safety education
│   ├── components/
│   │   ├── aleo/                       # Wallet connect, age verification form
│   │   ├── discovery/                  # Discovery cards, filters, match modal
│   │   ├── landing/                    # Landing page sections
│   │   ├── matches/                    # Matches / likes grids
│   │   ├── messaging/                  # Chat interface
│   │   ├── navigation/                 # Floating dock nav
│   │   ├── onboarding/                 # Multi-step onboarding
│   │   ├── subscription/               # Modal, dashboard, management page
│   │   └── ui/                         # shadcn/ui base components
│   ├── hooks/
│   │   ├── use-bliss-session.ts        # Wallet + verification + profile state
│   │   ├── use-subscription.ts         # Tier access, remaining counts
│   │   ├── use-x402-payment.ts         # Private micro-payment lifecycle hook
│   │   └── use-mobile.tsx              # Responsive breakpoint detection
│   └── lib/
│       ├── aleo/                       # Aleo service, wallet provider, types
│       ├── matching/                   # 24-interest bitfield compatibility engine
│       ├── messaging/                  # RSA-OAEP + AES-GCM + Gun.js E2E chat
│       ├── storage/                    # Gun.js P2P + Pinata IPFS + localStorage
│       ├── location/                   # Geohash encode/decode, haversine distance
│       ├── payment/                    # ARC-20 USDC payment service
│       ├── privacy-utils.ts            # Secure clear, PII validation
│       └── wallet-hash.ts              # SHA-256 wallet address hashing
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Shield Wallet](https://www.shieldwallet.com/) or [Leo Wallet](https://www.leo.app/) browser extension
- [Pinata](https://app.pinata.cloud/) account (free tier)

### Install & Run

```bash
git clone https://github.com/ArsCodeAmatworwororia/bliss.git
cd bliss
npm install
cp .env.example .env   # configure Pinata JWT + gateway
npm run dev             # → http://localhost:9002
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PINATA_JWT` | Yes | Pinata API JWT for IPFS uploads |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Yes | Pinata gateway domain |
| `NEXT_PUBLIC_ARC20_TOKEN_PROGRAM` | No | ARC-20 program (default: `token_registry.aleo`) |
| `NEXT_PUBLIC_ARC20_USDC_TOKEN_ID` | No | USDC token field ID |
| `NEXT_PUBLIC_BLISS_TREASURY_ADDRESS` | Yes | Treasury wallet for subscription payments |
| `NEXT_PUBLIC_ALEO_NETWORK` | No | Network (default: `testnet`) |
| `NEXT_PUBLIC_AGE_VERIFICATION_PROGRAM` | No | Age verification program ID |
| `NEXT_PUBLIC_PROFILE_VERIFICATION_PROGRAM` | No | Profile verification program ID |
| `NEXT_PUBLIC_COMPATIBILITY_MATCHING_PROGRAM` | No | Compatibility matching program ID |
| `NEXT_PUBLIC_SUBSCRIPTION_ACCESS_PROGRAM` | No | Subscription access program ID |

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack, port 9002) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type-check |

---

## Notes

- **Mock profiles are used for matching in the current build.** 18 seed profiles with pre-configured interests and 2 mutual matches with message threads are loaded to demonstrate the full flow. These will be replaced with real user data at launch.

- **Campus launch planned for mainnet.** Targeting ~1,000 users on my campus as the initial base. The local-first architecture scales naturally since most data stays on-device.

- **All smart contracts are fully functional on testnet.** Mainnet migration requires redeployment with production program IDs and a security audit.

---

## License

MIT

---

<p align="center">
  Built with ❤️ on <a href="https://aleo.org">Aleo</a>
</p>
