<p align="center">
  <img src="public/bliss-logo.png" alt="Bliss" width="120" />
</p>

<h1 align="center">Bliss</h1>
<p align="center"><strong>Dating reimagined: Private by design, verified by zero-knowledge</strong></p>

<p align="center">
  <a href="#why-bliss-is-different">Why Different</a> · <a href="#features">Features</a> · <a href="#how-it-works">How It Works</a> · <a href="#smart-contracts">Smart Contracts</a> · <a href="#getting-started">Getting Started</a> · <a href="#future-roadmap">Roadmap</a>
</p>

---

## Why Bliss is Different

**Traditional dating apps are surveillance engines disguised as matchmakers.** They collect, monetize, and often misuse your most intimate data — your face, your location, your conversations, your preferences. You're not the customer; you're the product.

**Bliss takes a fundamentally different approach:**

### 1. **Your Data Never Leaves Your Device**
Unlike Web2 apps where every swipe, message, and profile view is logged on corporate servers, Bliss is **local-first**. Your data lives on your device and syncs peer-to-peer. No company database. No data mining. No surveillance capitalism.

### 2. **Zero-Knowledge Verification**
Traditional apps collect your birthdate, upload your ID, store your photos. Bliss uses **Aleo's zero-knowledge cryptography** to verify you're 18+ without ever revealing your actual age. The blockchain confirms eligibility without seeing your personal information. This isn't just "privacy-friendly" — it's mathematically impossible for anyone to extract your data.

### 3. **True End-to-End Encryption**
Web2 apps claim "encryption" but hold the keys on their servers. Bliss uses **Gun.js peer-to-peer networking** with AES-GCM encryption derived from your wallet hash. Your messages never touch a server. They flow directly between matched users, encrypted with keys only you and your match possess.

### 4. **Wallet-Based Identity**
No email. No phone number. No password to leak. Your **Aleo wallet** is your identity — anonymous, cryptographically secure, and impossible to impersonate. No company ever knows your real-world identity unless you choose to share it.

### 5. **Quality Over Addiction**
Web2 apps are designed to maximize "engagement" (addiction). Bliss is built for **intentional connections**. Swipe limits encourage thoughtfulness. No infinite scroll. No dark patterns. The interface is clean, modern, distraction-free — inspired by Tinder's simplicity but without the surveillance backend.

### 6. **You Own Your Experience** *(Coming Soon)*
Instead of being locked into a subscription trickle-feed, Bliss will offer **two payment models**:
- **Pay-per-use** via x402 micropayments — pay only for the features you use, when you use them
- **Traditional subscription** for unlimited access

Both paid directly on-chain. No credit cards stored. No recurring charges unless you choose them. You control your spending and your privacy.

---

## What is Bliss?

Bliss is a **privacy-first decentralized dating app** built on the **Aleo blockchain**. It combines modern dating UX with cutting-edge Web3 technology to give you what traditional apps can't: **real privacy, real ownership, real security.**

- **Your profile** → Stored locally, synced peer-to-peer (Gun.js)
- **Your photos** → Stored on IPFS (content-addressed, censorship-resistant)
- **Your age** → Verified via zero-knowledge proof (no data stored)
- **Your messages** → End-to-end encrypted (keys never leave your device)
- **Your matches** → Mutual likes recorded locally, never in a central database

This isn't a crypto gimmick. This is dating rebuilt from first principles: **privacy by architecture, not by promise.**

---

## Features

### 🔐 Zero-Knowledge Age Verification
Users prove they're 18+ without revealing their actual age or birthdate. The Aleo smart contract issues a private `VerificationRecord` that can be reused indefinitely — no personal data is ever stored on-chain or anywhere else.

### 💫 Modern Swipe-Based Discovery
Browse profiles with a sleek, mobile-first card interface inspired by Tinder and Bumble, but without the surveillance. Like, pass, or super-like. Compatibility scores are calculated **locally on your device** using interest matching — never sent to a server.

- **Animated sidebar navigation** — Hover to expand and reveal full labels
- **Minimalist action buttons** — Clean black & white icons for distraction-free swiping
- **Full-viewport cards** — Immersive photo-first design that fits like a mobile app
- **Draggable swipe gestures** — Natural touch interactions with visual feedback

### 🤝 Mutual Match System
When two users like each other, a mutual match is created. Only then can they message each other. Match data stays on the user's device and syncs peer-to-peer via Gun.js — no central database, no server tracking your connections.

### 💬 End-to-End Encrypted Messaging
Matched users communicate through encrypted real-time chat powered by Gun.js P2P networking. Messages are encrypted with per-chat AES keys derived from both users' wallet hashes. **No server can read your conversations. Ever.**

### 🌐 Decentralized Storage Architecture
- **Profile images** → IPFS via Pinata (content-addressed, censorship-resistant, permanent)
- **Profile data** → Local-first storage with optional P2P sync via Gun.js
- **Wallet identity** → SHA-256 hashed for privacy (one-way, irreversible, anonymous)
- **Messages** → Gun.js distributed network (no central server, no surveillance)

### 💎 Quality-Focused Design
Unlike Web2 apps optimized for addiction, Bliss is designed for **intentional connections**:
- Daily swipe limits encourage thoughtfulness (not mindless swiping)
- Clean, distraction-free interface (no ads, no dark patterns)
- Mobile-first responsive design (works perfectly on any device)
- Smooth animations and micro-interactions (polished, not flashy)

### 🔮 Future: Flexible Payment Models *(Coming Soon)*
Bliss will offer two payment options — both processed on-chain for maximum privacy:

| Feature | Free Tier | Pay-Per-Use (x402) | Subscription |
|---------|-----------|-------------------|--------------|
| **Daily swipes** | 10 | Pay per swipe | Unlimited |
| **Active chats** | 3 | Pay per conversation | Unlimited |
| **Super likes** | — | Pay per use | Unlimited |
| **See who liked you** | — | Pay to reveal | Included |
| **Billing** | Free | Micropayments only when used | Monthly on-chain payment |

**x402 Micropayments Innovation:**  
Pay-per-use powered by HTTP 402 micropayments — pay fractions of a cent for individual features as you use them. No subscriptions. No recurring charges. No credit cards stored. True on-demand pricing.

### 🦁 Leo Wallet Integration
Connect your Leo wallet to sign in. No email, no phone number, no password. Your Aleo wallet address is your identity, and it's hashed before being stored anywhere. If you lose your device, your wallet recovers your identity and match history from the P2P network.

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

## Future Roadmap

Bliss is in active development. Here's what's coming next:

### Phase 1: Core Experience (Current)
- ✅ Zero-knowledge age verification
- ✅ Modern swipe-based discovery UI
- ✅ Mutual match system
- ✅ End-to-end encrypted messaging
- ✅ IPFS image storage
- ✅ Animated sidebar navigation
- ✅ Mobile-responsive design

### Phase 2: Payment Innovation (Q2 2026)
- 🔨 **x402 Micropayments Integration** — HTTP 402 status code-based pay-per-use model
  - Pay per swipe (sub-cent pricing)
  - Pay per conversation unlock
  - Pay to reveal who liked you
  - On-chain settlement via Aleo smart contracts
- 🔨 **Subscription Option** — Traditional monthly subscription as alternative
  - Unlimited swipes and chats
  - All premium features included
  - Managed on-chain via `bliss_subscription_access.aleo` contract

### Phase 3: Enhanced Privacy Features (Q3 2026)
- 📋 **Zero-knowledge location proofs** — Prove you're nearby without revealing exact location
- 📋 **Private profile traits** — Match on sensitive preferences without exposing them
- 📋 **Decentralized photo verification** — Prove photos are recent without uploading to a server
- 📋 **Ephemeral messaging** — Self-destructing messages with cryptographic guarantees

### Phase 4: Social Graph & Discovery (Q4 2026)
- 📋 **Friend referrals** — Encrypted referral system with privacy-preserving rewards
- 📋 **Interest-based communities** — Opt-in groups that don't leak membership
- 📋 **Advanced compatibility** — ML-powered matching while keeping data local
- 📋 **Video chat** — WebRTC peer-to-peer encrypted video calls

### Why x402 Micropayments?

Traditional subscription models lock you into paying for features you don't use. x402 micropayments let you **pay only for what you use, when you use it:**

- $0.001 per swipe (1/10th of a cent)
- $0.01 to start a conversation
- $0.05 to see who liked you

No monthly fees. No unused credits. No recurring charges. Just atomic, on-chain payments settled via Aleo smart contracts.

**Choice matters:** You can choose subscriptions (predictable pricing) or pay-per-use (extreme flexibility). Both options preserve your privacy — payments happen on-chain, and the app never knows your payment details.

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

### Design Philosophy

Bliss is built with a **quality-first mindset**:

- **Mobile-first responsive design** — Looks and feels native on any device
- **Smooth animations** — Framer Motion for polished micro-interactions
- **Modern dating app UX** — Inspired by Tinder/Bumble/Hinge, but without the surveillance
- **Minimalist aesthetics** — Clean black & white icons, distraction-free interface
- **No dark patterns** — Intentional design that respects your time and attention
- **Local-first performance** — Instant interactions, no loading spinners waiting for servers

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15, React 18, TypeScript | Modern, type-safe UI framework with App Router |
| **Styling** | Tailwind CSS, Radix UI (shadcn/ui), Framer Motion | Utility-first CSS, accessible components, smooth animations |
| **Blockchain** | Aleo (Leo language), Leo Wallet Adapter | Zero-knowledge proofs, on-chain verification, wallet integration |
| **Storage** | Gun.js (P2P sync), Pinata IPFS (images), localStorage | Decentralized data layer, no central server |
| **Encryption** | AES-GCM (messages), SHA-256 (wallet hashing), Web Crypto API | End-to-end message security, identity privacy |
| **AI** | Google Genkit (compatibility insights) | Local compatibility scoring, no data sent to servers |
| **3D** | Three.js (landing page visuals) | Immersive landing page experience |
| **Deployment** | Firebase App Hosting | Serverless hosting with global CDN |

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

### What Makes Bliss Truly Private

| Traditional Dating Apps | Bliss |
|-------------------------|-------|
| Store your birthdate in a database | Zero-knowledge proof — age verified, never stored |
| Upload your ID for verification | Mathematical proof of eligibility, no documents |
| Log every swipe and click | Local-first — your actions stay on your device |
| Read your messages on their servers | E2E encrypted — mathematically impossible to intercept |
| Sell your data to advertisers | No ads, no tracking, no data to sell |
| Lock your data behind their platform | Export and delete everything from Settings |
| Closed-source algorithms | Open-source smart contracts (auditable by anyone) |

### Technical Security Guarantees

- ✅ **No email / phone / password** — Wallet-based identity only (anonymous by default)
- ✅ **Zero-knowledge proofs** — Age verified without revealing birthdate (cryptographically impossible to reverse)
- ✅ **Wallet addresses hashed** — SHA-256 hashing, one-way, never stored in plaintext
- ✅ **E2E encrypted messaging** — AES-GCM with per-chat derived keys (keys never leave your device)
- ✅ **No central database** — Gun.js P2P + localStorage + IPFS (no single point of failure or surveillance)
- ✅ **Data sovereignty** — Export or delete all your data from Settings (you own everything)
- ✅ **Open source contracts** — All smart contract code is auditable on Aleo blockchain
- ✅ **No server-side logging** — Impossible to log what doesn't touch our servers

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

Bliss is open source because privacy technology should be transparent and auditable. We welcome contributions:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## Why This Matters

**Dating apps handle the most intimate data about your life.** Who you're attracted to. What you look like. Where you go. Who you talk to. Your political views. Your sexual preferences. Your vulnerabilities.

**In Web2, this data is the product.** It's logged, analyzed, sold, leaked, and weaponized. Dating apps aren't matchmakers — they're data brokers with a romantic UI.

**Web3 enables something different:** dating apps where privacy isn't a marketing promise, but a mathematical guarantee. Where your data never leaves your device. Where verification happens without surveillance. Where encryption isn't optional — it's the architecture.

**Bliss isn't just "a dating app on blockchain."** It's a proof that we can build better tools — more private, more secure, more respectful of human dignity — without sacrificing quality or user experience.

The future of dating isn't more surveillance. It's zero knowledge.

---

## License

MIT

---

<p align="center">
  Built with ❤️ on <a href="https://aleo.org">Aleo</a>
</p>
