# Ship-Now TODO List

Goal: move Bliss to a real-user testnet-ready state with secure rules, reliable UX, and enforceable limits.

## Progress Snapshot (2026-03-26)

Completed recently:
- Unpin route now requires signed proof and verifies CID ownership before unpin.
- Replay protection now requires Redis in production (no file fallback in prod).
- Age contract now requires active provider authorization records for attestation issuance.
- Profile service now fails closed when required on-chain writes fail.
- Subscription ticket-consuming transitions now enforce current-time validity windows.
- Profile on-chain adapter now requires a valid age credential record before profile creation.
- Deferred swipe receipt settlement queue now flushes on threshold + lifecycle with retry/backoff.
- Provider admin operational controls are now wired in Settings (init admin / register / revoke provider).
- Provider admin operations now require wallet allowlist membership + explicit operator acknowledgment in Settings.
- Provider-admin governance runbook added at `docs/provider-admin-governance.md`.
- Profile contract now includes `create_profile_with_age_bridge` transition that enforces quorum-age payload constraints (provider mask, nonce, version, issued/expires window).
- Profile adapter now submits `create_profile_with_age_bridge` using parsed quorum age-record payload fields, with optional legacy fallback controlled by `NEXT_PUBLIC_PROFILE_ALLOW_LEGACY_AGE_BOOL`.
- Discovery swipe path now consumes on-chain `record_swipe` entitlement before applying swipe/super-like actions (client counters no longer authoritative).
- Age contract `create_provider_admin` is now restricted to the governance wallet constant, closing arbitrary self-bootstrap of provider-admin authority.
- Added per-IP and per-wallet rate limits to IPFS routes (`upload-json`, `upload-image`, `unpin`) with Redis-backed enforcement and `429` responses.
- Added a single preflight release gate command (`npm run ship:preflight`) and hardened `ci:verify` to include lint.
- Ran full preflight successfully: typecheck, lint, no-mock enforcement, production build, and all contract builds.
- Implemented deferred swipe settlement queue with lifecycle retry/flush hooks and manual "Reconcile now" action in subscription settings.

Still pending:
- Complete provider-admin governance rollout in deployment environments (populate allowlist, assign dedicated governance wallet, and run emergency revoke drill).
- Complete profile-age bridge rollout to strict mode: redeploy profile contract and disable legacy bool fallback in all deployed environments.
  - Required config: keep `NEXT_PUBLIC_PROFILE_ALLOW_LEGACY_AGE_BOOL=false` after redeploy verification.
- Complete authoritative swipe settlement/reconciliation architecture.
  - Current state: deferred queue + retry/reconcile is implemented; full single-sign session allowance ticket model remains pending.

Decision recorded (2026-03-26):
- Keep `bliss_compatibility_matching_v2.aleo` and `bliss_subscription_access_v2.aleo` on testnet for this release cut.
- Rationale: no interface/version delta was introduced for these two programs in the current hardening slice, and both contracts build cleanly from current sources.
- Redeploy trigger policy: version-bump and fresh deploy only when transition signatures, record shapes, or security invariants change.

## P0 Blockers (Must Complete Before Launch)

1. Fix age trust model authority
- Add provider authorization model so users cannot self-issue provider attestations.
- Define provider allowlist (config/on-chain constant) and enforce provider signer checks.
- Acceptance: non-provider wallet cannot issue valid provider attestation.

2. Link profile creation/update to real age credential lineage
- Make profile transitions consume/validate quorum-backed age credential records.
- Remove boolean-only `age_verified` trust in profile transitions.
- Acceptance: profile creation fails unless valid, unrevoked, unexpired age record is provided.

3. Move swipe-limit enforcement from client-only to authoritative on-chain logic
- Discovery swipe path must consume entitlement/session allowance state enforced by contract.
- Keep client counters as display only.
- Acceptance: localStorage edits cannot increase effective swipe entitlement.

4. Lock down profile on-chain write bypasses
- Remove fail-open behavior that allows profile completion when on-chain writes fail.
- Add explicit retry/recover UX for wallet transport failures.
- Acceptance: user cannot reach completed onboarding state without required on-chain writes.

5. Protect IPFS unpin route with signed proof + ownership checks
- Require canonical signed proof for unpin similar to upload routes.
- Verify owner relationship to CID metadata before unpin.
- Acceptance: arbitrary CID unpin attempts are rejected.

## P1 Security and Abuse Hardening

6. Add API rate limits (upload JSON, upload image, unpin)
- [x] Per walletHash + per IP + per namespace limits.
- [x] Use Redis-backed counters with short windows.
- [x] Acceptance: flood attempts return 429 and do not consume upstream Pinata quota.

7. Enforce Redis availability for replay/rate systems in production
- Do not allow file-only replay store fallback in production runtime.
- Acceptance: production boot fails if replay/rate datastore is unavailable.

8. Tighten ticket consumption time checks in contracts
- Ensure all ticket-consuming transitions assert current execution time is inside ticket validity window.
- Acceptance: expired or not-yet-valid tickets fail on-chain.

9. Reduce sensitive logging
- Gate debug logs and redact tx/program/wallet details by default.
- Acceptance: production logs contain no sensitive identifiers.

## P1 UX-Critical Swipe Architecture (No Per-Swipe Wallet Popup)

10. Implement session allowance proof model (single-sign, many swipes)
- User signs once per session window to mint an allowance ticket (example: 30 swipes, 15 minutes).
- Swipes consume local signed intents against that allowance without wallet popup.
- On-chain settlement happens in one reconcile tx at end/threshold/timeout.
- Contract validates:
  - allowance owner
  - nonce/replay resistance
  - max swipes and expiry
  - already-settled prevention
- Acceptance: user can perform N swipes with zero wallet popup per swipe, while limits remain cryptographically enforceable.

11. Add settlement policy for reliability
- Trigger reconcile when one of these occurs:
  - session end
  - threshold reached (example every 10 swipes)
  - app background/unload recovery
- Add pending-settlement queue with retry/backoff.
- Acceptance: app recovers from network interruptions without losing swipe accounting.

12. Add graceful allowance depletion UX
- Show remaining allowance, auto-renew prompt before exhaustion, one-click renew.
- If renewal fails, switch to read-only swipe state.
- Acceptance: no abrupt hard-fail after swipe action.

## P2 Quality Gates and Release Readiness

13. Add contract invariant tests
- Underage rejection
- Expired credential rejection
- Revoked credential rejection
- Replay/ticket reuse rejection
- Over-limit swipe rejection
- Mutual action integrity
- Acceptance: invariant suite passes in CI.

14. Add integration/e2e test matrix
- Onboarding requires age proof lineage
- Profile creation fails without valid age proof
- Discovery blocks when allowance exhausted
- Retry/reconcile flows under RPC delay/disconnect
- Acceptance: matrix passes with deterministic outcomes.

15. Strengthen CI release gate
- [x] Include lint in CI verify script.
- [x] Add contract build + smoke checks in one command path.
- [x] Acceptance: single release command returns pass/fail for go/no-go.

16. Final v4-only cleanup
- Remove remaining compatibility shortcuts and dead paths.
- Regenerate deployment summary artifact from final contracts.
- Acceptance: runtime contains only canonical launch paths.

## Definition of Ready to Ship

- All P0 and P1 items complete.
- Invariant + integration matrix green.
- No Critical or High audit findings open.
- Dry-run launch on testnet succeeds with real wallets and realistic traffic.
