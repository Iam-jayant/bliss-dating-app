# Privacy-First Aleo Revamp Task List

Baseline: clean relaunch, no migration paths, v4-only target runtime.

## Status Legend
- [x] Completed
- [~] In progress
- [ ] Pending

## Phase 0 Security Reset
- [x] Remove browser-side Pinata secret usage and route writes through server APIs
- [x] Add signed request proof validation for upload routes
- [x] Add replay nonce protection for upload proofs
- [ ] Rotate all previously exposed secrets and document rotation evidence
- [ ] Freeze non-security feature changes until revamp gates complete

## Phase 1 v4 Contract Design and Enforcement
- [ ] Define v4 contract interfaces for age/profile/matching/subscription with explicit nonce/idempotency fields
- [ ] Add trusted timestamp sourcing and expiry invariants across all sensitive transitions
- [ ] Add explicit record version fields and strict version checks

## Phase 1 Age Trust Model
- [x] Implement multi-provider attestation record model
- [x] Implement quorum thresholds (initial 2-of-3)
- [~] Implement revocation semantics consumed by profile transitions

## Phase 1 Entitlement Model
- [ ] Implement session allowance proof issuance on-chain
- [ ] Implement reconcile/consume flow with anti-replay guarantees
- [ ] Enforce strict exhaustion rules in contract transitions

## Phase 1 Contract Invariants
- [ ] Underage rejection invariant tests
- [ ] Expired credential rejection invariant tests
- [ ] Replay rejection invariant tests
- [ ] Over-limit swipe rejection invariant tests
- [ ] Mutual-action integrity tests

## Phase 2 TypeScript Integration
- [~] Wire v4-compatible adapters for current contract signatures
- [ ] Enforce deterministic record selection by latest valid version
- [ ] Add robust tx confirmation/backoff policies across all service wrappers

## Phase 2 Privacy Hardening
- [x] Encrypt local identity private keys at rest
- [x] Enforce canonical wallet-bound signatures for sensitive synced events
- [ ] Move profile encryption secret from local-only generation to hardened lifecycle policy

## Phase 2 API and Storage Hardening
- [x] Move IPFS writes to server-side trust boundary
- [x] Validate signed requests server-side
- [ ] Replace fallback local replay store with shared durable backend in production environments
- [ ] Add structured PII-safe logging policy across all API routes

## Phase 3 Clean Relaunch Packaging
- [ ] Remove v2/v3 compatibility codepaths and toggles from runtime
- [ ] Confirm v4-only defaults across UI and service entrypoints
- [ ] Regenerate canonical deployment summary after final contract updates

## Phase 3 Release Gates
- [ ] Run typecheck, lint, and no-mock checks as mandatory gate
- [ ] Run full security and business behavior test matrix
- [ ] Validate bypass resistance and rollback drill before public launch

## Current Focus
- [~] Contract-level nonce/idempotency design for matching and subscription transitions

## Latest Delta
- [x] Matching contract now uses single-use action tickets before recording actions
- [x] Matching TS flow updated to issue and consume action tickets
- [x] Subscription operation tickets implemented for upgrade + swipe transitions
- [x] Age contract includes provider attestation, quorum verification, and attestation revocation transitions
- [ ] Profile transitions are not yet hard-linked to quorum-backed credential lineage