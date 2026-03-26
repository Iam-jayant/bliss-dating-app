# Bliss

Bliss is a privacy-first decentralized dating application built on Aleo + Gun.js.

This repository is now prepared for submission with real flows (no demo seed routes in active app paths):
- real wallet onboarding
- on-chain age verification and profile transitions
- on-chain swipe receipts
- mutual match + encrypted chat
- subscription payments through `credits.aleo`

## Submission Status

- Network: Aleo testnet
- Frontend: Next.js 15 (App Router)
- Runtime data plane: Gun.js (`bliss_v3` schema)
- Contract deployment artifacts: `contracts/deployment-artifacts/deployment-summary-testnet.json`

## What Is Implemented

### 1) On-chain verification and profile lifecycle
- Age verification via `verify_age` and possession checks.
- Profile lifecycle via `create_profile` and `update_profile`.
- Profile metadata includes signing and messaging public keys for signed events and encrypted messaging.

### 2) Discovery and matching (real data)
- Discovery uses real profiles from local + Gun.js sync.
- Like / pass / super-like actions are signed.
- Matching uses reciprocal actions with mutual-match event creation.
- Swipe actions are recorded on-chain through matching/subscription flows.

### 3) Real encrypted messaging
- Chat is unlocked only for mutual matches.
- Message payloads are encrypted and signed.
- Gun.js provides realtime P2P propagation.
- Local cache is used only for offline UX; sync reconciles with signed network events.

### 4) Subscription with private credits payment
- Tiers: `premium`, `plus`.
- Terms: `1`, `3`, `12` months.
- Payment flow uses `credits.aleo/transfer_private` to treasury, then on-chain subscription activation.
- Pricing (credits):
  - Premium: `10 / 27 / 96`
  - Plus: `20 / 54 / 192`
- Entitlement and usage checks come from on-chain records, with local cache only as UX acceleration.

### 5) No-mock enforcement in active app code
- CI check: `npm run check:no-mock`
- Blocks known mock/demo patterns in runtime source.
- Demo seed pathways are removed from production routes.

## Deployed Contracts (Aleo Testnet)

| Contract | Program ID | Explorer Tx |
|---|---|---|
| Age Verification | `bliss_age_verification_v3.aleo` | https://explorer.provable.com/transaction/at1y64dx63ssptlnup0qphk8ygaqhp0xt24ds8c6fq5mfxdnt4p7vgqjrv6ca |
| Profile Verification | `bliss_profile_verification_v2.aleo` | https://explorer.provable.com/transaction/at16s46n7z4g6a7vt9ttmlwu9eapw60j2r8zhd24850lav64326nqzsys8lna |
| Compatibility Matching | `bliss_compatibility_matching_v2.aleo` | https://explorer.provable.com/transaction/at1y3kays34gprdnhlqgvts4qgphwaf3t7eg4hj5l8em7wje9h0qqrq5wnuex |
| Subscription Access | `bliss_subscription_access_v2.aleo` | https://explorer.provable.com/transaction/at1hzndqn298fuslk7nvll7z79p5v6avtjagaxgrx9dxrspqzymlgzsylgray |

Single summary artifact:
- `contracts/deployment-artifacts/deployment-summary-testnet.json`

## Architecture

### Frontend
- Next.js App Router + React + TypeScript
- Wallet integration via Provable wallet adapters
- UI routes: onboarding, discovery, likes, matches, messages, profile, settings, subscription, safety

### Decentralized data plane
- Gun.js (`bliss_v3` namespace) for realtime profiles, likes, matches, and chats
- Signed event envelopes verified client-side

### On-chain plane (Aleo)
- Age proof records
- Profile records
- Matching receipts
- Subscription and usage records

## End-to-End User Flow

1. Connect wallet.
2. Verify age on-chain.
3. Create or update profile on-chain and publish discoverable profile data.
4. Browse discovery cards and submit signed actions.
5. Mutual like creates match and unlocks encrypted chat.
6. Send/receive encrypted realtime messages.
7. Buy Premium/Plus via private `credits.aleo` transfer and activate tier on-chain.
8. Feature limits and gating are enforced from subscription/usage records.

## Local Development

### Prerequisites
- Node.js 20+
- npm
- Leo CLI (for contract build/deploy)

### Setup
```bash
npm install
cp .env.example .env
```

Fill required values in `.env` (Pinata JWT, treasury address, and any deployment keys if deploying).

### Run app
```bash
npm run dev
```

Open `http://localhost:9002`.

## Contract Build and Deploy Process

Bliss includes deterministic scripts for all 4 contracts.

### Build all
```bash
npm run contracts:build
```

### Deploy all (guide-aligned)
```bash
npm run contracts:deploy
```

Current deploy script behavior (`scripts/aleo/deploy-all.ps1`):
- `clean -> build -> deploy`
- endpoint defaults to `https://api.explorer.provable.com/v2`
- uses `--consensus-version 11`
- supports full deploy or per-contract deploy
- writes JSON artifacts to `contracts/deployment-artifacts/`
- redacts sensitive values in stored outputs

### Per-contract deploy commands
```bash
npm run contracts:deploy:age
npm run contracts:deploy:profile
npm run contracts:deploy:matching
npm run contracts:deploy:subscription
```

## Quality Gates

Run before submission:
```bash
npm run typecheck
npm run lint
npm run check:no-mock
npm run build
```

Or all-in-one:
```bash
npm run ci:verify
```

## Repository Hygiene for Submission

This repo is structured so generated contract artifacts are not required in source control.

Ignored:
- `contracts/*/build/`
- `contracts/*/outputs/`
- `contracts/*/deployment/`
- verbose deployment logs in `contracts/deployment-artifacts/deployment-*.json`

Kept for reproducibility:
- `contracts/deployment-artifacts/deployment-summary-testnet.json`
- `scripts/aleo/build-all.ps1`
- `scripts/aleo/deploy-all.ps1`

## Security Notes

- Do not commit private keys.
- Keep `.env` local; use `.env.example` as template.
- If any key is exposed during local testing, rotate it before public submission.

## License

MIT
