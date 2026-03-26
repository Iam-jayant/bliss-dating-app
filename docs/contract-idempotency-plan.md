# Contract Idempotency Plan (Execution Slice)

This plan captures the next concrete contract work to reach anti-replay/idempotency requirements.

## Completed in this slice
- Added monotonic date invariant to subscription swipe tracking:
  - `assert(current_date >= usage.date)` in `record_swipe`
  - Prevents backdated date resets that could bypass free-tier limits.
- Implemented matching action ticket model:
  - Added `ActionTicketRecord` and `issue_action_ticket`
  - `record_action` now consumes a ticket record for single-use semantics
- Implemented subscription upgrade ticket model:
  - Added `OperationTicketRecord` and `issue_operation_ticket`
  - `upgrade_to_premium` and `upgrade_to_plus` now consume operation tickets
- Implemented subscription swipe ticket model:
  - `record_swipe` now consumes `OperationTicketRecord` with op type 3
  - Payment integration now issues ticket before swipe record transition

## Next implementation steps

1. Matching action nonce ticket model
- [x] Completed

2. Subscription operation nonce model
- [x] Completed for current transition set

3. Profile update freshness + version
- [x] Add explicit `version: u16` to `ProfileRecord`.
- [x] On update, require `new_version == old_version + 1`.
- Add timestamp freshness field and assert monotonic progression.

4. Age verification lineage nonce/version
- Add `version` and `issued_at` to age verification records.
- Enforce expected version transitions for possession proofs.
- Prepare contract surface for multi-provider quorum attestation records.

## TypeScript follow-up required after each contract change
- Update transition inputs in:
  - `src/lib/aleo/service.ts`
  - `src/lib/aleo/profile-service.ts`
  - `src/lib/payment/payment-service.ts`
- Regenerate fixture inputs under `contracts/*/inputs` for changed transitions.
- Re-run:
  - `npm run typecheck`
  - `npm run contracts:build`