# Age Verification Contract

Privacy-preserving age verification system for Bliss Wave 1.

## Overview

This Leo smart contract enables users to prove they are 18+ years old without revealing their actual age or any personal information. It uses zero-knowledge proofs to verify age eligibility and issues private credentials as Aleo records.

## Contract Functions

### `verify_age(private age: u8) -> VerificationRecord`
- Verifies user is 18+ years old
- Issues a private `VerificationRecord` on success
- Fails if age < 18
- No personal data is stored or revealed

### `prove_possession(private record: VerificationRecord) -> bool`
- Proves ownership of a valid verification record
- Returns boolean confirmation without revealing record contents
- Enables selective disclosure for access control

## Record Structure

```leo
record VerificationRecord {
    owner: address,      // User who owns this credential
    verified: bool,      // Always true for issued records
    _nonce: group,       // Aleo-required nonce for privacy
}
```

## Privacy Guarantees

- No age data is stored in contract state
- No personal information in issued records
- No expiry or validity periods
- No revocation complexity
- Zero-knowledge proof verification only

## Development

### Prerequisites
- Leo compiler installed
- Aleo account with testnet tokens

### Build
```bash
leo build
```

### Test
```bash
leo run verify_age 25u8
leo run verify_age 17u8  # Should fail
```

### Deploy
```bash
leo deploy --network testnet
```