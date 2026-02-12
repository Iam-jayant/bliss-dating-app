// Bliss Wave 1: Zero-Knowledge Age Verification Contract
// Privacy-first age verification without revealing personal data

program bliss_age_verification_v2.aleo {
    
    // Private credential record for verified adults
    // Contains no personal information, no expiry, no revocation complexity
    record VerificationRecord {
        owner: address,      // User who owns this credential
        verified: bool,      // Always true for issued records
    }

    // Constructor function (required for deployment)
    @noupgrade
    async constructor() {}

    // Verify user is 18+ years old using zero-knowledge proof
    // Input: private age (never stored or revealed)
    // Output: VerificationRecord if age >= 18, fails otherwise
    transition verify_age(private age: u8) -> VerificationRecord {
        // Zero-knowledge age check: age must be >= 18
        assert(age >= 18u8);
        
        // Issue private credential record
        // No personal data stored, no expiry logic
        return VerificationRecord {
            owner: self.caller,
            verified: true,
        };
    }

    // Prove possession of valid verification record
    // Input: private VerificationRecord (consumed)
    // Output: boolean confirmation + NEW VerificationRecord (reusable pattern)
    // This solves the single-use record limitation by issuing a fresh record
    transition prove_possession(private verification_record: VerificationRecord) -> (bool, VerificationRecord) {
        // Verify record authenticity and ownership
        assert_eq(verification_record.owner, self.caller);
        assert_eq(verification_record.verified, true);
        
        // Issue a new record to maintain verification status
        let new_record: VerificationRecord = VerificationRecord {
            owner: self.caller,
            verified: true,
        };
        
        // Return confirmation + new reusable record
        return (true, new_record);
    }
}