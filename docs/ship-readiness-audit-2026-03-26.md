# Ship Readiness Audit (2026-03-26)

## Verdict
Not ready to ship to real users on public testnet yet.

## Critical Findings

1. Self-issued "provider" attestations break the trust model
- Evidence: [contracts/age_verification/src/main.leo](contracts/age_verification/src/main.leo#L39), [contracts/age_verification/src/main.leo](contracts/age_verification/src/main.leo#L48)
- Why it matters: `issue_provider_attestation` enforces `owner == self.caller`, so the end-user can mint their own provider attestations.
- Impact: Quorum age proof can be forged by any user, defeating age assurance.
- Fix: Introduce provider-authorized keys/addresses and require provider signer authorization separate from owner.

2. Profile contract does not cryptographically link to age proof lineage
- Evidence: [contracts/profile_verification/src/main.leo](contracts/profile_verification/src/main.leo#L22), [contracts/profile_verification/src/main.leo](contracts/profile_verification/src/main.leo#L32), [src/lib/aleo/profile-service.ts](src/lib/aleo/profile-service.ts#L73)
- Why it matters: Profile creation only checks a boolean `age_verified`, and client passes `true`.
- Impact: A caller can create a profile without proving valid age credential lineage.
- Fix: Add age credential record input to `create_profile` and verify ownership, non-revocation, and non-expiry on-chain.

3. Swipe-limit enforcement remains client-side in active swipe path
- Evidence: [src/components/discovery/discovery-page.tsx](src/components/discovery/discovery-page.tsx#L239), [src/components/discovery/discovery-page.tsx](src/components/discovery/discovery-page.tsx#L345), [src/lib/payment/payment-service.ts](src/lib/payment/payment-service.ts#L358)
- Why it matters: `recordSwipeOnChain` exists but is never called in discovery flow.
- Impact: local counter bypass (localStorage editing/reset) can bypass free-tier limits.
- Fix: Call on-chain `record_swipe` for every swipe action and treat client counter as optimistic UI only.

4. On-chain profile write failures can silently downgrade to off-chain only state
- Evidence: [src/lib/storage/profile-service.ts](src/lib/storage/profile-service.ts#L132), [src/lib/storage/profile-service.ts](src/lib/storage/profile-service.ts#L231)
- Why it matters: recoverable wallet transport errors skip on-chain write/update and continue.
- Impact: users can appear onboarded while missing required on-chain state.
- Fix: For production mode, fail closed (block completion) when on-chain writes fail.

## High Findings

1. Operation tickets are not time-validated where consumed
- Evidence: [contracts/subscription_access/src/main.leo](contracts/subscription_access/src/main.leo#L85), [contracts/subscription_access/src/main.leo](contracts/subscription_access/src/main.leo#L86), [contracts/subscription_access/src/main.leo](contracts/subscription_access/src/main.leo#L110), [contracts/subscription_access/src/main.leo](contracts/subscription_access/src/main.leo#L111), [contracts/subscription_access/src/main.leo](contracts/subscription_access/src/main.leo#L139)
- Why it matters: ticket checks compare `expiration` against ticket times, not current execution time; swipe path has no issued/expires checks.
- Impact: stale tickets can potentially be reused via crafted inputs.
- Fix: add `current_time` input and assert `issued_at <= current_time <= expires_at` for all ticket-consuming transitions.

2. Unpin API lacks signed proof/authn boundary
- Evidence: [src/app/api/ipfs/unpin/route.ts](src/app/api/ipfs/unpin/route.ts#L10)
- Why it matters: unpin only requires CID and server JWT.
- Impact: any caller that can hit route can request unpins.
- Fix: require signed proof (walletHash/nonce/timestamp/signature) and ownership checks against CID metadata.

3. No rate limiting on IPFS API routes
- Evidence: [src/app/api/ipfs/upload-json/route.ts](src/app/api/ipfs/upload-json/route.ts), [src/app/api/ipfs/upload-image/route.ts](src/app/api/ipfs/upload-image/route.ts), [src/app/api/ipfs/unpin/route.ts](src/app/api/ipfs/unpin/route.ts)
- Why it matters: replay protection is present, but abuse by many valid requests is not constrained.
- Impact: quota exhaustion / denial of wallet upload service.
- Fix: add per-wallet and per-IP rate limits in Redis.

4. Age quorum flows are not integrated into onboarding/runtime
- Evidence: [src/lib/aleo/service.ts](src/lib/aleo/service.ts#L62), [src/lib/aleo/service.ts](src/lib/aleo/service.ts#L115)
- Why it matters: wrappers exist but are unused.
- Impact: app still runs on old single-assert path instead of quorum model.
- Fix: integrate issue/verify quorum flow into onboarding and profile gating.

5. Excessive wallet/tx logging in service layer
- Evidence: [src/lib/aleo/service.ts](src/lib/aleo/service.ts#L217), [src/lib/aleo/service.ts](src/lib/aleo/service.ts#L233), [src/lib/aleo/service.ts](src/lib/aleo/service.ts#L276)
- Why it matters: logs can leak operational details in shared telemetry.
- Fix: gate logs by debug flag and redact tx/program identifiers where not needed.

## Medium Findings

1. Local fallback replay store is not multi-instance safe
- Evidence: [src/lib/security/replay-store.ts](src/lib/security/replay-store.ts#L13), [src/lib/security/replay-store.ts](src/lib/security/replay-store.ts#L90)
- Why it matters: file fallback is per-instance; clustered/serverless deployments can diverge.
- Fix: require Redis in production; fail startup if absent.

2. Nonce generation relies on Date.now in several flows
- Evidence: [src/lib/payment/payment-service.ts](src/lib/payment/payment-service.ts#L315), [src/lib/payment/payment-service.ts](src/lib/payment/payment-service.ts#L386), [src/lib/aleo/profile-service.ts](src/lib/aleo/profile-service.ts#L139), [src/lib/aleo/service.ts](src/lib/aleo/service.ts#L75)
- Why it matters: millisecond collisions under burst traffic are possible.
- Fix: include cryptographic random suffix or deterministic unique counters.

3. Relaxed lint config suppresses important guardrails
- Evidence: [.eslintrc.json](.eslintrc.json#L4), [.eslintrc.json](.eslintrc.json#L7)
- Why it matters: disabled hooks and any checks can hide correctness regressions.
- Fix: re-enable incrementally and fix violations.

4. CI verification script omits lint gate
- Evidence: [package.json](package.json#L23)
- Why it matters: release checks can pass with lint regressions.
- Fix: include `npm run lint` in `ci:verify`.

## Confirmed Non-Issues (from prior raw scan)

1. Public Pinata JWT exposure
- Current state: Not present in template; server uses `PINATA_JWT` only.
- Evidence: [.env.example](.env.example#L35)

2. Onboarding age step hard-blocking
- Current state: Step only advances after successful verification + possession checks.
- Evidence: [src/components/onboarding/onboarding-page.tsx](src/components/onboarding/onboarding-page.tsx#L84), [src/components/onboarding/onboarding-page.tsx](src/components/onboarding/onboarding-page.tsx#L118), [src/components/onboarding/onboarding-page.tsx](src/components/onboarding/onboarding-page.tsx#L145)

## Edge Cases To Add Before Ship

1. Provider-auth mismatch: user attempts to issue provider attestation without provider auth.
2. Expired operation ticket consumed in upgrade and swipe paths.
3. Replayed operation ticket plaintext reused after first consumption.
4. Swipe action failure after optimistic local increment and rollback correctness.
5. Multi-instance replay store behavior when Redis is unavailable.
6. Unpin misuse: unauthorized CID unpin attempts.
7. Quorum with one revoked attestation and one expired attestation (2-of-3 boundary).
8. Profile creation attempt without valid quorum credential linkage.

## Release Recommendation

Do not ship to real users yet. Fix all Critical items, then High items 1-3, then rerun full gate set:
- `npm run typecheck`
- `npm run lint`
- `npm run check:no-mock`
- `npm run contracts:build`
- add invariant/integration tests for the edge cases above.
