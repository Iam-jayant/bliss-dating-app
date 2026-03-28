# Bliss

Bliss is a privacy-first decentralized dating app built on Aleo.  
This version is focused on real testnet user flows: on-chain verification and entitlement checks, encrypted messaging, and no demo-only runtime paths.

## Project Scope

Bliss uses two execution planes:

- On-chain (Aleo): age verification, profile lifecycle, swipe entitlement accounting, subscription state.
- Off-chain (Gun.js + IPFS): realtime sync for discovery/matches/chat and encrypted profile/media storage.

Core user flow:

1. Connect wallet.
2. Verify age.
3. Create profile (on-chain + encrypted payload).
4. Swipe with entitlement enforcement.
5. Unlock match on reciprocal actions.
6. Chat with encrypted messages.
7. Upgrade to Premium/Plus via private `credits.aleo` transfer + on-chain activation.

## Transition From Last Submission

| Area | Last Submission Baseline | New Version |
|---|---|---|
| Contract lineup | Mixed older program versions in active docs/runtime references | Age + Profile upgraded to `v4`; Matching + Subscription intentionally kept at `v2` for this release cut |
| Age trust model | Weaker provider authority assumptions | `bliss_age_verification_v4.aleo` adds provider-admin governance, provider authorization records, quorum verification, and revocation |
| Profile-age linkage | `create_profile` could rely on boolean-only age signal | `create_profile_with_age_bridge` path enforces bridge payload constraints (`provider_mask`, `nonce`, `version`, `issued_at`, `expires_at`, `current_time`) |
| Swipe enforcement | Client-side counters could become authoritative | Discovery flow consumes on-chain `record_swipe` entitlement with deferred settlement + retry/backoff |
| Profile write safety | Risk of off-chain-only completion under wallet failures | Profile service now fails closed when required on-chain writes cannot run |
| IPFS route security | Upload/unpin boundaries were softer | Signed proofs + replay checks + per-IP/per-wallet rate limits; unpin now verifies CID ownership before delete |
| Submission quality gate | Fragmented verification commands | `npm run ship:preflight` and `npm run ci:verify` enforce typecheck, lint, no-mock, build, and contract-build gates |

## Technical Stack

- App: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS.
- Wallet + chain: `@provablehq/aleo-wallet-adaptor-*`, `@provablehq/sdk`.
- Realtime data: Gun.js namespace `bliss_v3`.
- Storage: Pinata through server routes (`upload-json`, `upload-image`, `unpin`).
- Security controls:
  - Signed request proofs on sensitive IPFS routes.
  - Replay nonce protection (`consumeReplayNonce`), Redis required in production.
  - API rate limiting (`enforceApiRateLimit`), Redis-backed in production.
  - Runtime no-mock guard via `npm run check:no-mock`.

## Smart Contracts In Use

| Domain | Program ID | Key transitions |
|---|---|---|
| Age verification | `bliss_age_verification_v4.aleo` | `create_provider_admin`, `register_provider`, `issue_provider_attestation`, `verify_age_with_quorum`, `revoke_provider_attestation` |
| Profile verification | `bliss_profile_verification_v4.aleo` | `create_profile`, `create_profile_with_age_bridge`, `update_profile` |
| Compatibility matching | `bliss_compatibility_matching_v2.aleo` | `issue_action_ticket`, `record_action`, `create_mutual_match` |
| Subscription access | `bliss_subscription_access_v2.aleo` | `issue_operation_ticket`, `upgrade_to_premium`, `upgrade_to_plus`, `record_swipe` |

## Deployment References (Aleo Testnet)

Source of truth: `contracts/deployment-artifacts/deployment-summary-testnet.json`  
Generated at: `2026-03-26T12:04:04+05:30` (consensus version `11`)

| Contract | Program ID | Deploy Transaction |
|---|---|---|
| Age Verification | `bliss_age_verification_v4.aleo` | https://explorer.provable.com/transaction/at1wuwhrcrtvugf7hpcndehatuhg8ykacrkt7n83a23dg39xjw8pvqqj24ldc |
| Profile Verification | `bliss_profile_verification_v4.aleo` | https://explorer.provable.com/transaction/at1z9yeywk58tqjs8fsxq6rndezta39ns4ajr2p3s93p5c8pkutwcgsd4f0xq |
| Compatibility Matching | `bliss_compatibility_matching_v2.aleo` | https://explorer.provable.com/transaction/at1y3kays34gprdnhlqgvts4qgphwaf3t7eg4hj5l8em7wje9h0qqrq5wnuex |
| Subscription Access | `bliss_subscription_access_v2.aleo` | https://explorer.provable.com/transaction/at1hzndqn298fuslk7nvll7z79p5v6avtjagaxgrx9dxrspqzymlgzsylgray |

## Local Setup

Prerequisites:

- Node.js 20+
- npm
- Leo CLI (for contract scripts)

```bash
npm install
cp .env.example .env
npm run dev
```

App URL: `http://localhost:9002`

## Verification Commands

```bash
npm run ci:verify
npm run ship:preflight
```

Contract scripts:

```bash
npm run contracts:build
npm run contracts:deploy
```

## License

MIT
