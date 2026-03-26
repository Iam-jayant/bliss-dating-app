# Provider Admin Governance Runbook

This runbook defines how to operate provider-admin transitions safely in testnet and production.

## Scope

Applies to these on-chain operations in `bliss_age_verification_v4.aleo`:
- `create_provider_admin`
- `register_provider`
- `revoke_provider`

## Operational Controls

1. Feature gate:
- Keep `NEXT_PUBLIC_ENABLE_PROVIDER_ADMIN_TOOLS=false` by default.
- Enable only for controlled admin sessions.

2. Wallet allowlist:
- Set `NEXT_PUBLIC_PROVIDER_ADMIN_ALLOWLIST` to a comma-separated list of approved operator wallets.
- Example:
  - `NEXT_PUBLIC_PROVIDER_ADMIN_ALLOWLIST=aleo1...,aleo1...`
- Any wallet not in allowlist is blocked in UI.

3. Explicit operator acknowledgment:
- Admin UI requires explicit acknowledgment before execution.
- Operators must confirm governance approval before actions.

4. Role separation:
- Use a dedicated governance wallet for admin transitions.
- Do not use personal user wallets for provider governance operations.

5. Contract-level bootstrap guard:
- `create_provider_admin` is restricted in-contract to the governance wallet constant in `contracts/age_verification/src/main.leo`.
- Changing governance bootstrap wallet requires updating that constant and redeploying the age contract.

## Change Procedure

1. Governance proposal approved (provider add/remove).
2. Open a controlled admin session with feature gate enabled.
3. Connect allowlisted governance wallet.
4. Execute `register_provider` or `revoke_provider`.
5. Capture transaction ID in release log.
6. Disable admin feature gate after session.

## Incident Response

If an unauthorized provider is detected:
1. Revoke provider immediately with governance wallet.
2. Capture transaction ID and timestamp.
3. Rotate allowlist if compromise is suspected.
4. Review recent provider-admin transaction history.

## Pre-Launch Checklist

- `NEXT_PUBLIC_ENABLE_PROVIDER_ADMIN_TOOLS` defaults to `false`.
- `NEXT_PUBLIC_PROVIDER_ADMIN_ALLOWLIST` set in deployment environment.
- Governance wallet ownership documented.
- Emergency revoke drill completed once on testnet.
