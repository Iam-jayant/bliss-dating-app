<p align="center">
  <img src="public/bliss-logo.png" alt="Bliss" width="120" />
</p>

<h1 align="center">Bliss</h1>
<p align="center"><strong>Privacy-first dating, powered by zero-knowledge proofs on Aleo</strong></p>

<p align="center">
  <a href="https://bliss-dating.vercel.app"><strong>Live Site</strong></a> · <a href="https://youtu.be/tQ06a9bLeZc"><strong>Demo Video</strong></a>
</p>

<p align="center">
  <a href="#overview">Overview</a> · <a href="#features">Features</a> · <a href="#tech-stack">Tech Stack</a> · <a href="#system-design">System Design</a> · <a href="#smart-contracts">Smart Contracts</a> · <a href="#getting-started">Getting Started</a> · <a href="#project-progress">Progress</a>
</p>

---

## Overview

Bliss is a **decentralized dating application** built on the [Aleo](https://aleo.org) blockchain. It replaces the surveillance-backed model of traditional dating apps with a **local-first, cryptographically private** architecture — your data never leaves your device, your age is verified via zero-knowledge proofs, and your messages are end-to-end encrypted peer-to-peer.

| What | How |
|------|-----|
| **Identity** | Leo Wallet — no email, phone, or password |
| **Age verification** | ZK proof on Aleo — age confirmed without revealing it |
| **Profile storage** | Local-first + IPFS (Pinata) + Gun.js P2P sync |
| **Messaging** | E2E encrypted via Gun.js with RSA-OAEP + AES-GCM |
| **Matching** | Compatibility scored locally using interest bitfield matching |
| **Payments** | On-chain subscriptions via Leo smart contract |

> **Status:** Core experience complete on Aleo Testnet. Four smart contracts deployed. Hosted on Vercel.

---

## Features

- **Zero-Knowledge Age Verification** — Prove 18+ without revealing your birthdate. Aleo issues a reusable `VerificationRecord` on-chain.
- **Swipe-Based Discovery** — Modern card UI with like, pass, super-like, and undo. Compatibility scored locally from 24 interest categories.
- **Mutual Match System** — Both users must like each other before messaging unlocks. Match data stays on-device.
- **E2E Encrypted Chat** — RSA-OAEP 2048-bit key exchange + AES-GCM per-message encryption over Gun.js P2P. No server reads your messages.
- **Decentralized Storage** — Profile images on IPFS (Pinata), profile data encrypted with AES-GCM (PBKDF2 key derivation), synced via Gun.js.
- **Privacy-Preserving Location** — Geohash-based proximity at configurable precision (city / neighborhood / block) — never reveals exact coordinates.
- **Wallet-Based Identity** — SHA-256 hashed wallet address as your anonymous, deterministic identity key.
- **Subscription Tiers** — Free (10 swipes/day, 3 chats), Premium, Plus — managed on-chain with daily usage tracking.
- **Safety Center** — Education on dating safety, E2E encryption explainers, meeting tips, and reporting tools.

<details>
<summary><strong>UI / UX Details</strong></summary>

- Mobile-first responsive design with animated sidebar navigation
- Framer Motion micro-interactions and smooth transitions
- Full-viewport photo-first discovery cards with drag-to-swipe gestures
- Dark mode by default, clean minimalist aesthetic (Geist Sans + Instrument Serif)
- shadcn/ui component library (Radix UI primitives + Tailwind CSS)
- Three.js landing page visuals, film grain overlay, confetti effects
- No ads, no dark patterns, no infinite scroll

</details>

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Framework** | Next.js 15 (App Router, Turbopack) | SSR, routing, API layer |
| **UI** | React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion | Components, styling, animation |
| **Blockchain** | Aleo (Leo language), Leo Wallet Adapter, Provable SDK | ZK proofs, on-chain state, wallet auth |
| **P2P / Messaging** | Gun.js | Real-time sync, encrypted messaging relay |
| **IPFS** | Pinata | Profile image + encrypted data storage |
| **Encryption** | Web Crypto API (RSA-OAEP, AES-GCM, SHA-256, PBKDF2) | Message E2E encryption, identity hashing, data encryption |
| **3D** | Three.js | Landing page visuals |
| **Hosting** | Vercel | Serverless deployment |

---

## System Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER DEVICE (Source of Truth)                  │
│                                                                         │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐                 │
│  │ localStorage │   │  Web Crypto  │   │  Bliss App   │                 │
│  │  (Profiles,  │   │  (RSA-OAEP,  │   │  (Next.js 15 │                 │
│  │   Matches,   │   │   AES-GCM,   │   │   App Router)│                 │
│  │   Session)   │   │   PBKDF2)    │   │              │                 │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                 │
│         │                  │                   │                         │
└─────────┼──────────────────┼───────────────────┼─────────────────────────┘
          │                  │                   │
          │    ┌─────────────┼───────────────────┼──────────────┐
          │    │             │                   │              │
          ▼    ▼             ▼                   ▼              ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │   Gun.js     │   │  Pinata IPFS │   │ Leo Wallet   │   │    Vercel    │
  │  P2P Network │   │              │   │              │   │              │
  │              │   │  ┌────────┐  │   │  ┌────────┐  │   │  ┌────────┐  │
  │  • Profile   │   │  │ Images │  │   │  │ Sign   │  │   │  │ SSR /  │  │
  │    sync      │   │  │ (IPFS) │  │   │  │ Txns   │  │   │  │ Static │  │
  │  • Encrypted │   │  ├────────┤  │   │  ├────────┤  │   │  │ Assets │  │
  │    messages  │   │  │Profiles│  │   │  │ Auth   │  │   │  └────────┘  │
  │  • Like/     │   │  │(AES-   │  │   │  │ (Aleo) │  │   │              │
  │    match     │   │  │ GCM)   │  │   │  └────────┘  │   │              │
  │    actions   │   │  └────────┘  │   │      │       │   │              │
  └──────────────┘   └──────────────┘   └──────┼───────┘   └──────────────┘
                                               │
                                               ▼
                                  ┌─────────────────────────┐
                                  │    Aleo Blockchain       │
                                  │    (Testnet)             │
                                  │                          │
                                  │  ┌────────────────────┐  │
                                  │  │ Age Verification    │  │
                                  │  │ (ZK Proof ≥ 18)    │  │
                                  │  ├────────────────────┤  │
                                  │  │ Profile Records     │  │
                                  │  │ (Encrypted on-chain)│  │
                                  │  ├────────────────────┤  │
                                  │  │ Compatibility       │  │
                                  │  │ Matching (Private)  │  │
                                  │  ├────────────────────┤  │
                                  │  │ Subscription        │  │
                                  │  │ Access (Tiers)      │  │
                                  │  └────────────────────┘  │
                                  └─────────────────────────┘
```

### Data Flow — End-to-End

```
┌─────────┐     ┌─────────────┐      ┌───────────────┐      ┌─────────────┐
│  User A  │    │  User A's   │      │   Gun.js P2P  │      │  User B's   │
│  Device  │───▶│  Encryption│─────▶│   Relay Mesh  │─────▶│  Decryption │
│          │    │  (RSA+AES)  │      │  (No storage) │      │  (RSA+AES)  │
└─────────┘     └─────────────┘      └───────────────┘      └─────────────┘
     │                                                              │
     │          ┌─────────────────────────────────────┐             │
     └─────────▶│         Aleo Blockchain             │◀────────────┘
                │                                     │
                │  verify_age() ──▶ VerificationRecord│
                │  record_action() ──▶ MatchRecord    │
                │  check_mutual() ──▶ MutualMatch     │
                │  upgrade_sub() ──▶ SubscriptionRec  │
                └─────────────────────────────────────┘
```

### Matching & Compatibility Pipeline

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  User Profile │     │  Interest Bitfield│     │  Compatibility   │
│              │     │  Encoding         │     │  Score           │
│  24 interest │────▶│                   │────▶│                  │
│  categories  │     │  e.g. 0b110010... │     │  Bitwise AND     │
│  selected    │     │  (24-bit u32)     │     │  + count bits    │
└──────────────┘     └──────────────────┘     │  + intent weight │
                                               │                  │
                                               │  4+ = 100%       │
                                               │  3  = 75%        │
                                               │  2  = 50%        │
                                               │  1  = 25%        │
                                               │  0  = 0%         │
                                               └────────┬─────────┘
                                                        │
                                                        ▼
                                               ┌──────────────────┐
                                               │  Same algorithm  │
                                               │  runs on-chain   │
                                               │  (Leo contract)  │
                                               │  AND locally     │
                                               │  (TypeScript)    │
                                               └──────────────────┘
```

### User Journey

```
  Connect Leo Wallet ──▶ ZK Age Verification ──▶ Create Profile ──▶ Discovery
         │                       │                      │               │
    (Aleo auth,             (prove ≥ 18,          (name, photos,    (swipe cards,
     no email/              no birthdate           bio, interests    local compat
     password)              revealed)              → IPFS + local)  scoring)
                                                                       │
                                                                       ▼
                            E2E Encrypted Chat ◀── Mutual Match ◀── Like/Pass
                                    │                   │               │
                              (RSA-OAEP +         (both users       (recorded
                               AES-GCM via        liked each        on-chain as
                               Gun.js P2P)         other)           MatchRecord)
```

### Storage Architecture

```
                    ┌─────────────────────────┐
                    │     User's Device        │
                    │                          │
                    │   localStorage (fast)    │◀─── Primary read/write
                    │   • Profile data         │     (offline-capable)
                    │   • Matches & likes      │
                    │   • Session state        │
                    │   • Chat history         │
                    └───────────┬──────────────┘
                                │
                    ┌───────────┴──────────────┐
                    │           │               │
                    ▼           ▼               ▼
          ┌──────────────┐ ┌────────────┐ ┌──────────────┐
          │  Gun.js P2P  │ │Pinata IPFS │ │    Aleo      │
          │              │ │            │ │  Blockchain   │
          │  Real-time   │ │ Encrypted  │ │              │
          │  sync across │ │ profile    │ │ Verification │
          │  devices     │ │ JSON +     │ │ records,     │
          │              │ │ images     │ │ match state, │
          │  Encrypted   │ │            │ │ subscription │
          │  with wallet │ │ AES-GCM +  │ │ tiers        │
          │  hash        │ │ PBKDF2     │ │              │
          └──────────────┘ └────────────┘ └──────────────┘
```

**No central server stores user data.** The app is local-first — works offline and syncs when connected.

<details>
<summary><strong>Project Structure</strong></summary>

```
bliss/
├── contracts/                      # Aleo smart contracts (Leo language)
│   ├── age_verification/           # ZK age proof — deployed
│   ├── profile_verification/       # On-chain profile records — deployed
│   ├── compatibility_matching/     # Private match records — deployed
│   └── subscription_access/        # Subscription tiers — deployed
├── public/                         # Static assets
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Landing page (marketing)
│   │   ├── app/                    # → Redirects to /onboarding
│   │   ├── onboarding/             # Wallet connect + age verify + profile setup
│   │   ├── discovery/              # Swipe-based profile discovery
│   │   ├── likes/                  # "Who liked you" (premium)
│   │   ├── matches/                # Mutual matches grid
│   │   ├── messages/               # E2E encrypted chat
│   │   ├── profile/                # View/edit profile
│   │   ├── settings/               # Settings + data export/delete
│   │   └── safety/                 # Safety Center education
│   ├── components/
│   │   ├── aleo/                   # Wallet connect button, age verification form
│   │   ├── discovery/              # Discovery cards, filters, match modal
│   │   ├── landing/                # 24 landing page components
│   │   ├── matches/                # Matches grid, likes grid
│   │   ├── matching/               # Compatibility display
│   │   ├── messaging/              # Chat interface
│   │   ├── navigation/             # App sidebar nav
│   │   ├── onboarding/             # Multi-step onboarding wizard
│   │   ├── privacy/                # Privacy info components
│   │   ├── profile/                # Profile editor, photo upload
│   │   ├── safety/                 # Safety center components
│   │   ├── settings/               # Settings panel
│   │   ├── subscription/           # Subscription plan UI
│   │   └── ui/                     # shadcn/ui base components
│   ├── hooks/
│   │   ├── use-bliss-session.ts    # Wallet + verification + profile state
│   │   ├── use-mobile.tsx          # Responsive breakpoint detection
│   │   └── use-toast.ts            # Toast notifications
│   └── lib/
│       ├── aleo/                   # Aleo service, config, types, wallet provider
│       │   ├── config.ts           # Network config, program IDs, fees
│       │   ├── service.ts          # AleoService — verify_age, prove_possession
│       │   ├── profile-service.ts  # AleoProfileService — on-chain profile CRUD
│       │   ├── wallet-provider.tsx # React context for Leo Wallet
│       │   └── types.ts           # VerificationRecord, WalletState, etc.
│       ├── matching/               # Compatibility engine
│       │   ├── compatibility-service.ts  # 24-interest bitfield scoring
│       │   └── matching-admin.ts         # Dev tools (window.blissMatching)
│       ├── messaging/              # E2E encrypted chat
│       │   └── messaging-service.ts      # RSA-OAEP + AES-GCM + Gun.js
│       ├── storage/                # Decentralized storage layer
│       │   ├── gun-storage.ts      # Gun.js P2P sync + AES encryption
│       │   ├── pinata-storage.ts   # IPFS via Pinata + AES-GCM encryption
│       │   ├── profile-service.ts  # Orchestrates IPFS + on-chain profile ops
│       │   ├── profile.ts          # localStorage profile CRUD
│       │   └── types.ts            # ProfileData, BioPromptType, DatingIntent
│       ├── location/               # Privacy-preserving geolocation
│       │   └── geohash-service.ts  # Encode/decode geohash, haversine distance
│       ├── payment/                # Subscription payments
│       │   └── payment-service.ts  # On-chain subscription purchase + tiers
│       ├── privacy-utils.ts        # Secure clear, PII validation, error sanitization
│       ├── wallet-hash.ts          # SHA-256 wallet address hashing
│       ├── seed-profiles.ts        # 18 demo profiles + 2 mutual matches
│       └── utils.ts                # General utilities
├── tailwind.config.ts              # Tailwind + shadcn/ui theme
└── next.config.ts                  # Next.js config (Gun.js polyfills, image domains)
```

</details>

<details>
<summary><strong>Core Libraries Deep Dive</strong></summary>

#### Aleo Integration (`src/lib/aleo/`)
- **`AleoService`** — Creates and submits wallet transactions for `verify_age()` and `prove_possession()`. Includes privacy validation (strips PII from outputs) and error sanitization.
- **`AleoProfileService`** — Extends base service for profile, matching, and subscription contracts. Methods for `createProfileOnChain()`, `recordAction()`, `checkMutualMatch()`, `createSubscriptionTransaction()`.
- **`AleoWalletProvider`** — React context wrapping `@demox-labs/aleo-wallet-adapter-react` with `LeoWalletAdapter` configured for TestnetBeta.

#### Matching Engine (`src/lib/matching/`)
- **24 interest categories** mapped to bit positions in a `u32` bitfield
- Mirrors the on-chain contract logic: bitwise AND → count shared bits → percentage score
- Enhanced scoring adds dating intent weighting (±10–30% adjustments)
- Stores likes, matches, passes in localStorage with versioned keys

#### Messaging (`src/lib/messaging/`)
- **`MessageEncryption`** — RSA-OAEP 2048-bit key pair generation, public key exchange, per-message AES-GCM encryption
- **`MessageStorage`** — Gun.js P2P relay (gun-manhattan, gun-us on Heroku) with localStorage fallback
- Messages flow directly between peers — never stored on a central server

#### Storage (`src/lib/storage/`)
- **Gun.js layer** — P2P sync for profiles, likes, matches. Data AES-encrypted with wallet hash before syncing.
- **Pinata IPFS layer** — Profile data encrypted with AES-GCM (PBKDF2 key from wallet signature, 100k iterations). Profile images uploaded as content-addressed IPFS objects.
- **localStorage layer** — Fast offline cache, primary read path. SHA-256 wallet hash as storage key.

#### Location (`src/lib/location/`)
- Full geohash encode/decode implementation
- Three privacy levels: city (precision 4, ±20km), neighborhood (precision 5, ±2.4km), block (precision 6, ±610m)
- Haversine distance calculation between geohash centers

#### Payment (`src/lib/payment/`)
- Three tiers: Free ($0), Premium ($9.99 / 10 credits), Plus ($19.99 / 20 credits)
- `purchaseSubscription()` creates on-chain transaction via wallet
- Tracks subscription expiry and remaining swipes

</details>

---

## Smart Contracts

Four Leo contracts deployed on **Aleo Testnet**:

| Contract | Program ID | Deployment Tx Hash |
|----------|-----------|-------------------|
| **Age Verification** | `bliss_age_verification_v2.aleo` | [`at1dk3xsjqansftu2ug4g89ghya748ufq05nyp5hxjtflw660e3lvpsks47k4`](https://explorer.provable.com/transaction/at1dk3xsjqansftu2ug4g89ghya748ufq05nyp5hxjtflw660e3lvpsks47k4) |
| **Profile Verification** | `bliss_profile_verification.aleo` | [`at1jzv8h7fcna6ye5r67nxy0fpsmguf89y3kx0amrg3nerv9y2rsvyqyq5z5v`](https://explorer.provable.com/transaction/at1jzv8h7fcna6ye5r67nxy0fpsmguf89y3kx0amrg3nerv9y2rsvyqyq5z5v) |
| **Compatibility Matching** | `bliss_compatibility_matching.aleo` | [`at1ymc37c2tp4yd2yd6ctmjq3vauhhx4xxpgjxa3eg57hh27dgxcupq7dcs27`](https://explorer.provable.com/transaction/at1ymc37c2tp4yd2yd6ctmjq3vauhhx4xxpgjxa3eg57hh27dgxcupq7dcs27) |
| **Subscription Access** | `bliss_subscription_access.aleo` | [`at159y8mclk8l7m2ezcspf5ygg4astrpw346evl2cxyn4a76spcjqgqmdg5gz`](https://explorer.provable.com/transaction/at159y8mclk8l7m2ezcspf5ygg4astrpw346evl2cxyn4a76spcjqgqmdg5gz) |

<details>
<summary><strong>Age Verification — Contract Code</strong></summary>

```leo
transition verify_age(private age: u8) -> VerificationRecord {
    assert(age >= 18u8);
    return VerificationRecord { owner: self.caller, verified: true };
}

transition prove_possession(private record: VerificationRecord) -> (bool, VerificationRecord) {
    assert_eq(record.owner, self.caller);
    assert_eq(record.verified, true);
    return (true, VerificationRecord { owner: self.caller, verified: true });
}
```

</details>

<details>
<summary><strong>Contract Details</strong></summary>

| Contract | Transitions | Records | Description |
|----------|------------|---------|-------------|
| **Age Verification** | `verify_age(age)`, `prove_possession(record)` | `VerificationRecord` | Asserts age ≥ 18 via ZK proof. Returns a private, reusable verification record. `prove_possession` re-validates without consuming the record. |
| **Profile Verification** | `create_profile()`, `update_profile()` | `ProfileRecord` | Stores interests bitfield, dating intent, location geohash, IPFS CID, and subscription tier on-chain. All fields private. |
| **Compatibility Matching** | `record_action()`, `check_mutual_match()` | `MatchRecord`, `MutualMatchRecord` | Records like/pass/superlike as private `MatchRecord`. Creates `MutualMatchRecord` when both users liked each other. Bitwise compatibility scoring (AND + popcount). |
| **Subscription Access** | `create_subscription()`, `upgrade_subscription()`, `use_swipe()` | `SubscriptionRecord`, `UsageRecord` | Free: 10 swipes/day, 3 chats. Premium/Plus: unlimited. Tracks daily usage with auto-reset. |

</details>

<details>
<summary><strong>Compatibility Scoring Algorithm</strong></summary>

Both the on-chain contract and local engine use the same algorithm:

1. Interests encoded as a 24-bit bitfield (one bit per interest category)
2. Shared interests = bitwise AND of both bitfields
3. Count set bits → score: 4+ shared = 100%, 3 = 75%, 2 = 50%, 1 = 25%, 0 = 0%
4. Enhanced local scoring adds dating intent compatibility weighting (±10–30%)

The 24 interest categories: Travel, Music, Fitness, Cooking, Photography, Art, Reading, Gaming, Hiking, Movies, Yoga, Dancing, Coffee, Wine, Pets, Technology, Fashion, Sports, Nature, Meditation, Volunteering, Languages, Foodie, Nightlife.

</details>

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Leo Wallet](https://www.leo.app/) browser extension
- [Pinata](https://app.pinata.cloud/) account (free tier)

### Install & Run

```bash
git clone https://github.com/your-org/bliss.git
cd bliss
npm install
cp .env.example .env   # configure Pinata JWT + gateway
npm run dev             # → http://localhost:9002
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 9002, Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type check |

<details>
<summary><strong>Environment Variables</strong></summary>

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PINATA_JWT` | Yes | Pinata API JWT for IPFS uploads |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Yes | Pinata gateway domain |
| `NEXT_PUBLIC_ALEO_NETWORK` | No | Network name (default: `testnet`) |
| `NEXT_PUBLIC_ALEO_API_URL` | No | Aleo explorer API endpoint |
| `NEXT_PUBLIC_AGE_VERIFICATION_PROGRAM` | No | Age verification program ID |
| `NEXT_PUBLIC_PROFILE_VERIFICATION_PROGRAM` | No | Profile verification program ID |
| `NEXT_PUBLIC_COMPATIBILITY_MATCHING_PROGRAM` | No | Compatibility matching program ID |
| `NEXT_PUBLIC_SUBSCRIPTION_ACCESS_PROGRAM` | No | Subscription access program ID |
| `NEXT_PUBLIC_ALEO_FEE_MICROCREDITS` | No | Transaction fee (default: 1,000,000 = 1 credit) |
| `NEXT_PUBLIC_MAX_SWIPES_FREE_TIER` | No | Daily swipe limit, free tier (default: 10) |
| `NEXT_PUBLIC_MAX_CHATS_FREE_TIER` | No | Chat limit, free tier (default: 3) |
| `NEXT_PUBLIC_DEFAULT_GEOHASH_PRECISION` | No | Location precision (default: 5 / ~2.4 km) |
| `NEXT_PUBLIC_DEBUG_MODE` | No | Enable debug logging (default: `false`) |

</details>

---

## Privacy & Security

| Traditional Dating Apps | Bliss |
|-------------------------|-------|
| Store your birthdate in a database | ZK proof — age verified, never stored |
| Upload ID for verification | Mathematical proof, no documents |
| Log every swipe and click | Local-first — actions stay on your device |
| Read messages on their servers | E2E encrypted — impossible to intercept |
| Sell data to advertisers | No ads, no tracking, no data to sell |
| Lock data behind their platform | Export / delete everything from Settings |
| Closed-source algorithms | Open-source, auditable smart contracts |

<details>
<summary><strong>Technical Security Details</strong></summary>

- **No PII required** — Wallet-based identity; no email, phone, or password
- **Zero-knowledge proofs** — Age verified without revealing birthdate (cryptographically irreversible)
- **Wallet address hashing** — SHA-256, one-way, never stored in plaintext
- **E2E encrypted messaging** — RSA-OAEP 2048-bit key exchange + AES-GCM per-message encryption; keys never leave the device
- **No central database** — Gun.js P2P + localStorage + IPFS; no single point of failure
- **IPFS data encryption** — AES-GCM with PBKDF2 key derivation (100k iterations, SHA-256) from wallet signature
- **Privacy validation** — `validateContractPrivacy()` ensures no PII leaks in contract outputs
- **Error sanitization** — Ages, years, and sensitive data stripped from error messages
- **Secure memory clearing** — `secureClear()` overwrites sensitive data before garbage collection
- **Data sovereignty** — Full export or deletion from Settings; you own everything
- **Open source contracts** — All Leo contract code auditable on Aleo blockchain

</details>

---

## Project Progress

### Overall: ~80% complete

### Completed Features

- [x] Zero-knowledge age verification (deployed on testnet)
- [x] Profile verification contract (deployed on testnet)
- [x] Compatibility matching contract (deployed on testnet)
- [x] Subscription access contract (deployed on testnet)
- [x] Leo Wallet integration & wallet-based auth
- [x] Multi-step onboarding flow (wallet → age verify → profile)
- [x] Swipe-based discovery UI with like, pass, super-like, undo
- [x] Local compatibility scoring engine (24-interest bitfield matching)
- [x] Mutual match system with notifications
- [x] E2E encrypted messaging (RSA-OAEP + AES-GCM over Gun.js P2P)
- [x] Profile image upload to IPFS via Pinata
- [x] Encrypted profile data storage on IPFS (AES-GCM + PBKDF2)
- [x] Gun.js P2P sync for profiles, likes, and matches
- [x] Privacy-preserving geohash-based location (3 precision levels)
- [x] On-chain subscription tier management (Free / Premium / Plus)
- [x] Safety Center with education content and reporting
- [x] Settings page with data export and account deletion
- [x] Mobile-first responsive design with animated sidebar nav
- [x] Landing page with Three.js visuals, feature comparison, pricing
- [x] Dark mode, Framer Motion animations, shadcn/ui components
- [x] Privacy utilities (secure clear, PII validation, error sanitization)
- [x] Deployed on Vercel

### Remaining for Mainnet Launch

- [ ] Migrate all 4 contracts from testnet to **Aleo mainnet**
- [ ] Real user onboarding and profile seeding (replace mock profiles)
- [ ] Production Gun.js relay infrastructure (replace Heroku peers)
- [ ] Subscription payment flow end-to-end testing on mainnet
- [ ] Security audit of Leo smart contracts
- [ ] Rate limiting and abuse prevention for P2P layer
- [ ] Performance optimization for large user bases

---

## Notes

- **Mock profiles are used for matching in the current build.** Since there are no real users yet, 18 seed profiles with pre-configured interests and 2 mutual matches with message threads are loaded to demonstrate the full matching and messaging flow. These will be replaced with real user data at launch.

- **Campus launch planned for mainnet.** On mainnet launch, I'm targeting my campus as the initial user base — confident in onboarding ~1,000 users to start. The local-first architecture means the app scales naturally since most data stays on-device, making a campus rollout a strong first test of real-world usage.

- **All smart contracts are fully functional on testnet.** The four Leo contracts (age verification, profile verification, compatibility matching, subscription access) are deployed and tested. Mainnet migration requires redeployment with production program IDs.

---

## License

MIT

---

<p align="center">
  Built with ❤️ on <a href="https://aleo.org">Aleo</a>
</p>
