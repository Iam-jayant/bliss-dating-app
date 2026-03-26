// Bliss Wave 1: Zero-Knowledge Age Verification Contract
// Privacy-first age verification without revealing personal data

program bliss_age_verification_v4.aleo {

    // Governance wallet allowed to bootstrap provider-admin authority.
    // Rotate by updating this constant and redeploying the program.
    const GOVERNANCE_ADMIN: address = aleo1jfjml96zfx8g0aj9zfsw4qyyqe979rslvd6pqqe526kkts8y7s8qjpwjjs;

    // Single-owner provider admin authority record.
    record ProviderAdminRecord {
        owner: address,
        version: u16,
    }

    // Authorization record proving a caller is an active age provider.
    record ProviderAuthorizationRecord {
        owner: address,
        provider_id: u8,
        active: bool,
        version: u16,
    }

    // Provider attestation used for quorum-based verification.
    record ProviderAttestationRecord {
        owner: address,
        provider_id: u8,
        age_over_18: bool,
        issued_at: u32,
        expires_at: u32,
        revoked: bool,
        nonce: u64,
        version: u16,
    }

    // Quorum-backed age credential with expiry and revocation state.
    record QuorumVerificationRecord {
        owner: address,
        verified: bool,
        provider_mask: u8,
        issued_at: u32,
        expires_at: u32,
        revoked: bool,
        nonce: u64,
        version: u16,
    }
    
    // Private credential record for verified adults
    // Contains no personal information, no expiry, no revocation complexity
    record VerificationRecord {
        owner: address,      // User who owns this credential
        verified: bool,      // Always true for issued records
    }

    // Constructor function (required for deployment)
    @noupgrade
    async constructor() {}

    // Initialize provider-admin authority (single private record).
    transition create_provider_admin(private owner: address) -> ProviderAdminRecord {
        assert_eq(owner, self.caller);
        assert_eq(owner, GOVERNANCE_ADMIN);

        return ProviderAdminRecord {
            owner: owner,
            version: 1u16,
        };
    }

    // Register an allowed provider id for a provider address.
    transition register_provider(
        private admin: ProviderAdminRecord,
        private provider: address,
        private provider_id: u8,
    ) -> (ProviderAdminRecord, ProviderAuthorizationRecord) {
        assert_eq(admin.owner, self.caller);
        assert(provider_id <= 7u8);
        assert(admin.version < 65535u16);

        let next_admin: ProviderAdminRecord = ProviderAdminRecord {
            owner: admin.owner,
            version: admin.version + 1u16,
        };

        let authorization: ProviderAuthorizationRecord = ProviderAuthorizationRecord {
            owner: provider,
            provider_id: provider_id,
            active: true,
            version: 1u16,
        };

        return (next_admin, authorization);
    }

    // Revoke provider authorization.
    transition revoke_provider(
        private admin: ProviderAdminRecord,
        private authorization: ProviderAuthorizationRecord,
    ) -> (ProviderAdminRecord, ProviderAuthorizationRecord) {
        assert_eq(admin.owner, self.caller);
        assert_eq(authorization.active, true);
        assert(admin.version < 65535u16);
        assert(authorization.version < 65535u16);

        let next_admin: ProviderAdminRecord = ProviderAdminRecord {
            owner: admin.owner,
            version: admin.version + 1u16,
        };

        let revoked_authorization: ProviderAuthorizationRecord = ProviderAuthorizationRecord {
            owner: authorization.owner,
            provider_id: authorization.provider_id,
            active: false,
            version: authorization.version + 1u16,
        };

        return (next_admin, revoked_authorization);
    }

    // Provider issues an attestation that owner is 18+.
    transition issue_provider_attestation(
        private authorization: ProviderAuthorizationRecord,
        private owner: address,
        private provider_id: u8,
        private age: u8,
        private issued_at: u32,
        private expires_at: u32,
        private nonce: u64,
        private version: u16,
    ) -> (ProviderAttestationRecord, ProviderAuthorizationRecord) {
        assert_eq(authorization.owner, self.caller);
        assert_eq(authorization.provider_id, provider_id);
        assert_eq(authorization.active, true);
        assert(provider_id <= 7u8);
        assert(age >= 18u8);
        assert(age <= 120u8);
        assert(issued_at > 0u32);
        assert(expires_at > issued_at);
        assert(authorization.version < 65535u16);
        assert(version > 0u16);

        let attestation: ProviderAttestationRecord = ProviderAttestationRecord {
            owner: owner,
            provider_id: provider_id,
            age_over_18: true,
            issued_at: issued_at,
            expires_at: expires_at,
            revoked: false,
            nonce: nonce,
            version: version,
        };

        let refreshed_authorization: ProviderAuthorizationRecord = ProviderAuthorizationRecord {
            owner: authorization.owner,
            provider_id: authorization.provider_id,
            active: true,
            version: authorization.version + 1u16,
        };

        return (attestation, refreshed_authorization);
    }

    // Revoke an issued provider attestation (single attestation lineage).
    transition revoke_provider_attestation(
        private attestation: ProviderAttestationRecord,
        private owner: address,
        private revoked_at: u32,
    ) -> ProviderAttestationRecord {
        assert_eq(owner, self.caller);
        assert_eq(attestation.owner, owner);
        assert_eq(attestation.revoked, false);
        assert(revoked_at >= attestation.issued_at);
        assert(attestation.version < 65535u16);

        return ProviderAttestationRecord {
            owner: attestation.owner,
            provider_id: attestation.provider_id,
            age_over_18: attestation.age_over_18,
            issued_at: attestation.issued_at,
            expires_at: attestation.expires_at,
            revoked: true,
            nonce: attestation.nonce,
            version: attestation.version + 1u16,
        };
    }

    // Verify age using quorum (2-of-3 or 3-of-3) provider attestations.
    transition verify_age_with_quorum(
        private owner: address,
        private attestation_1: ProviderAttestationRecord,
        private attestation_2: ProviderAttestationRecord,
        private attestation_3: ProviderAttestationRecord,
        private current_time: u32,
        private required_quorum: u8,
        private validity_window: u32,
    ) -> QuorumVerificationRecord {
        assert_eq(owner, self.caller);
        assert(required_quorum >= 2u8);
        assert(required_quorum <= 3u8);
        assert(validity_window > 0u32);

        // Ensure provider uniqueness in 3-attestation quorum set.
        assert_neq(attestation_1.provider_id, attestation_2.provider_id);
        assert_neq(attestation_1.provider_id, attestation_3.provider_id);
        assert_neq(attestation_2.provider_id, attestation_3.provider_id);

        let valid_count: u8 = 0u8;
        let provider_mask: u8 = 0u8;

        if (
            attestation_1.owner == owner &&
            attestation_1.provider_id <= 7u8 &&
            attestation_1.age_over_18 == true &&
            attestation_1.revoked == false &&
            current_time >= attestation_1.issued_at &&
            current_time <= attestation_1.expires_at
        ) {
            valid_count = valid_count + 1u8;
            provider_mask = provider_mask | provider_bit(attestation_1.provider_id);
        }

        if (
            attestation_2.owner == owner &&
            attestation_2.provider_id <= 7u8 &&
            attestation_2.age_over_18 == true &&
            attestation_2.revoked == false &&
            current_time >= attestation_2.issued_at &&
            current_time <= attestation_2.expires_at
        ) {
            valid_count = valid_count + 1u8;
            provider_mask = provider_mask | provider_bit(attestation_2.provider_id);
        }

        if (
            attestation_3.owner == owner &&
            attestation_3.provider_id <= 7u8 &&
            attestation_3.age_over_18 == true &&
            attestation_3.revoked == false &&
            current_time >= attestation_3.issued_at &&
            current_time <= attestation_3.expires_at
        ) {
            valid_count = valid_count + 1u8;
            provider_mask = provider_mask | provider_bit(attestation_3.provider_id);
        }

        assert(valid_count >= required_quorum);

        return QuorumVerificationRecord {
            owner: owner,
            verified: true,
            provider_mask: provider_mask,
            issued_at: current_time,
            expires_at: current_time + validity_window,
            revoked: false,
            nonce: attestation_1.nonce + attestation_2.nonce + attestation_3.nonce,
            version: 1u16,
        };
    }

    // Verify user is 18+ years old using zero-knowledge proof
    // Input: private age (never stored or revealed)
    // Output: VerificationRecord if age >= 18, fails otherwise
    transition verify_age(private owner: address, private age: u8) -> VerificationRecord {
        // Zero-knowledge age check: age must be >= 18
        assert_eq(owner, self.caller);
        assert(age >= 18u8);
        assert(age <= 120u8);
        
        // Issue private credential record
        // No personal data stored, no expiry logic
        return VerificationRecord {
            owner: owner,
            verified: true,
        };
    }

    // Prove possession of valid verification record
    // Input: private VerificationRecord (consumed)
    // Output: boolean confirmation + NEW VerificationRecord (reusable pattern)
    // This solves the single-use record limitation by issuing a fresh record
    transition prove_possession(private verification_record: VerificationRecord, private owner: address) -> (bool, VerificationRecord) {
        // Verify record authenticity and ownership
        assert_eq(owner, self.caller);
        assert_eq(verification_record.owner, owner);
        assert_eq(verification_record.verified, true);
        
        // Issue a new record to maintain verification status
        let new_record: VerificationRecord = VerificationRecord {
            owner: owner,
            verified: true,
        };
        
        // Return confirmation + new reusable record
        return (true, new_record);
    }

    // Prove possession of a valid quorum-backed age credential.
    transition prove_quorum_possession(
        private quorum_record: QuorumVerificationRecord,
        private owner: address,
        private current_time: u32,
    ) -> (bool, QuorumVerificationRecord) {
        assert_eq(owner, self.caller);
        assert_eq(quorum_record.owner, owner);
        assert_eq(quorum_record.verified, true);
        assert_eq(quorum_record.revoked, false);
        assert(current_time >= quorum_record.issued_at);
        assert(current_time <= quorum_record.expires_at);
        assert(quorum_record.version < 65535u16);

        let renewed: QuorumVerificationRecord = QuorumVerificationRecord {
            owner: owner,
            verified: true,
            provider_mask: quorum_record.provider_mask,
            issued_at: quorum_record.issued_at,
            expires_at: quorum_record.expires_at,
            revoked: false,
            nonce: quorum_record.nonce,
            version: quorum_record.version + 1u16,
        };

        return (true, renewed);
    }

    inline provider_bit(provider_id: u8) -> u8 {
        if (provider_id == 0u8) { return 1u8; }
        else if (provider_id == 1u8) { return 2u8; }
        else if (provider_id == 2u8) { return 4u8; }
        else if (provider_id == 3u8) { return 8u8; }
        else if (provider_id == 4u8) { return 16u8; }
        else if (provider_id == 5u8) { return 32u8; }
        else if (provider_id == 6u8) { return 64u8; }
        else { return 128u8; }
    }
}
