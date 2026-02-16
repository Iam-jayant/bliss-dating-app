<p align="center">
  <img src="public/bliss-logo.png" alt="Bliss" width="120" />
</p>

<h1 align="center">Bliss</h1>
<p align="center"><strong>Privacy-first dating powered by zero-knowledge proofs on Aleo</strong></p>

<p align="center">
  <a href="#features">Features</a> · <a href="#how-it-works">How It Works</a> · <a href="#smart-contracts">Smart Contracts</a> · <a href="#getting-started">Getting Started</a> · <a href="#architecture">Architecture</a>
</p>

---

## What is Bliss?

Bliss is a decentralized dating application that puts user privacy first. Unlike traditional dating apps that harvest personal data, Bliss uses **zero-knowledge proofs** on the **Aleo blockchain** to verify users without exposing sensitive information.

Your age is verified without revealing your birthdate. Your interests are matched without a central server reading them. Your messages are encrypted end-to-end. No company ever sees your private data.

---

## Features

### Zero-Knowledge Age Verification
Users prove they are 18+ without revealing their actual age or birthdate. The Aleo smart contract issues a private `VerificationRecord` that can be reused — no personal data is ever stored on-chain.

### Privacy-Preserving Profile Discovery
Browse profiles with a swipe-based interface. Like, pass, or super-like. Compatibility scores are calculated locally using interest matching — never sent to a server. Daily swipe limits encourage intentional connections.

### Mutual Match System
When two users like each other, a mutual match is created. Only then can they message each other. Match data stays on the user's device and syncs peer-to-peer via Gun.js — no central database.

### End-to-End Encrypted Messaging
Matched users communicate through encrypted real-time chat powered by Gun.js P2P networking. Messages are encrypted with per-chat AES keys derived from both users' wallet hashes. No server can read your conversations.

### Decentralized Storage
- **Profile images** → IPFS via Pinata (content-addressed, censorship-resistant)
- **Profile data** → Local-first with P2P sync via Gun.js
- **Wallet identity** → SHA-256 hashed for privacy (one-way, irreversible)

### Subscription Tiers
| | Free | Premium | Plus |
|---|---|---|---|
| Daily swipes | 10 | Unlimited | Unlimited |
| Active chats | 3 | Unlimited | Unlimited |
| Super likes | — | ✓ | ✓ |
| See who liked you | — | — | ✓ |

Subscription state is managed on-chain via the `bliss_subscription_access.aleo` contract — the app never knows your payment details.

### Leo Wallet Integration
Connect your Leo wallet to sign in. No email, no phone number, no password. Your Aleo wallet address is your identity, and it's hashed before being stored anywhere.

---

## How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Leo Wallet  │────▶│  Aleo Blockchain  │────▶│  ZK Proof (Age)  │
│  (Identity)  │     │  (Smart Contracts)│     │  (No data leak)  │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │
       ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Bliss App   │────▶│  Gun.js P2P Sync  │────▶│  E2E Encrypted   │
│  (Next.js)   │     │  (No server)      │     │  Messaging       │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │
       ▼
┌─────────────┐
│  Pinata IPFS │
│  (Images)    │
└─────────────┘
```

1. **Connect wallet** — User connects their Leo wallet (Aleo)
2. **Verify age** — A ZK proof confirms age ≥ 18 without revealing the actual age
3. **Create profile** — Name, photos, bio, interests — stored locally and on IPFS
4. **Discover** — Swipe through profiles; compatibility is scored locally
5. **Match** — Mutual likes create a match; both parties are notified
6. **Chat** — E2E encrypted messaging via Gun.js peer-to-peer network

---

## Smart Contracts

Four Leo smart contracts deployed on Aleo Testnet:

| Contract | Program ID | Status | Purpose |
|----------|-----------|--------|---------|
| **Age Verification** | `bliss_age_verification_v2.aleo` | ✅ Deployed | ZK proof of age ≥ 18, issues reusable `VerificationRecord` |
| **Profile Verification** | `bliss_profile_verification.aleo` | 🔨 Built | On-chain profile records with encrypted preferences |
| **Compatibility Matching** | `bliss_compatibility_matching.aleo` | 🔨 Built | Private match records and mutual match computation |
| **Subscription Access** | `bliss_subscription_access.aleo` | 🔨 Built | Privacy-preserving subscription tiers and usage limits |

### Age Verification Contract

```leo
// Zero-knowledge age check — age is never stored or revealed
transition verify_age(private age: u8) -> VerificationRecord {
    assert(age >= 18u8);
    return VerificationRecord { owner: self.caller, verified: true };
}

// Prove you have a valid verification without consuming it
transition prove_possession(private record: VerificationRecord) -> (bool, VerificationRecord) {
    assert_eq(record.owner, self.caller);
    assert_eq(record.verified, true);
    return (true, VerificationRecord { owner: self.caller, verified: true });
}
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Leo Wallet](https://www.leo.app/) browser extension
- [Pinata](https://app.pinata.cloud/) account (free tier — for profile image storage)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/bliss.git
cd bliss

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Pinata JWT and gateway

# Start the development server
npm run dev
```

The app runs at **http://localhost:9002**.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PINATA_JWT` | Yes | Pinata API JWT for IPFS image uploads |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Yes | Pinata gateway domain |
| `NEXT_PUBLIC_ALEO_NETWORK` | No | `testnet` (default) |
| `NEXT_PUBLIC_ALEO_API_URL` | No | Aleo explorer API endpoint |
| `NEXT_PUBLIC_AGE_VERIFICATION_PROGRAM` | No | Age verification program ID |
| `NEXT_PUBLIC_MAX_SWIPES_FREE_TIER` | No | Free tier daily swipe limit (default: 10) |
| `NEXT_PUBLIC_MAX_CHATS_FREE_TIER` | No | Free tier chat limit (default: 3) |

### Available Scripts

```bash
npm run dev        # Start dev server (port 9002, Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking
```

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Styling** | Tailwind CSS, Radix UI (shadcn/ui), Framer Motion |
| **Blockchain** | Aleo (Leo language), Leo Wallet Adapter |
| **Storage** | Gun.js (P2P sync), Pinata IPFS (images), localStorage |
| **Encryption** | AES-GCM (messages), SHA-256 (wallet hashing), Web Crypto API |
| **AI** | Google Genkit (compatibility insights) |
| **3D** | Three.js (landing page visuals) |
| **Deployment** | Firebase App Hosting |

### Project Structure

```
bliss/
├── contracts/                  # Aleo smart contracts (Leo)
│   ├── age_verification/       # ZK age proof (deployed)
│   ├── compatibility_matching/ # Private match records
│   ├── profile_verification/   # On-chain profile records
│   └── subscription_access/    # Subscription tiers
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── discovery/          # Swipe-based profile discovery
│   │   ├── matches/            # Mutual matches view
│   │   ├── messages/           # Encrypted chat
│   │   ├── onboarding/         # Wallet + age verification flow
│   │   ├── profile/            # User profile management
│   │   └── settings/           # App settings & data export
│   ├── components/
│   │   ├── aleo/               # Wallet connection & age verification UI
│   │   ├── discovery/          # Discovery cards, filters, match modal
│   │   ├── landing/            # Landing page sections
│   │   ├── matches/            # Matches grid & likes view
│   │   ├── messaging/          # Chat interface
│   │   ├── onboarding/         # Onboarding wizard
│   │   ├── profile/            # Profile editor & photo upload
│   │   ├── settings/           # Settings panel
│   │   └── ui/                 # shadcn/ui base components
│   ├── hooks/                  # React hooks (session, mobile, toast)
│   └── lib/
│       ├── aleo/               # Aleo service, config, wallet provider
│       ├── matching/           # Compatibility scoring engine
│       ├── messaging/          # Messaging service
│       ├── storage/            # Gun.js, Pinata, profile persistence
│       └── location/           # Geohash-based proximity
└── .env.example                # Environment template
```

### Data Flow

```
User Device (source of truth)
  ├── localStorage          → Profile data, matches, likes, settings
  ├── Gun.js P2P Network    → Real-time sync, encrypted messages
  ├── Pinata IPFS           → Profile images (content-addressed)
  └── Aleo Blockchain       → Age verification proofs, subscription state
```

No central server stores user data. The app is local-first — it works offline and syncs when connected.

---

## Privacy & Security

- **No email / phone / password** — Wallet-based identity only
- **Zero-knowledge proofs** — Age verified without revealing birthdate
- **Wallet addresses hashed** — SHA-256, one-way, stored nowhere in plaintext
- **E2E encrypted messaging** — AES-GCM with per-chat derived keys
- **No central database** — Gun.js P2P + localStorage + IPFS
- **Data export & deletion** — Users can export or delete all their data from Settings
- **Open source contracts** — All smart contract code is auditable

---

## Deployment

### Firebase App Hosting

The project includes an `apphosting.yaml` configured for Firebase App Hosting:

```bash
# Build and deploy
npm run build
firebase deploy
```

### Self-Hosting

Any Node.js 18+ environment that can run Next.js:

```bash
npm run build
npm run start
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT

---

<p align="center">
  Built with ❤️ on <a href="https://aleo.org">Aleo</a>
</p>
