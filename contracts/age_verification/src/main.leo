// Bliss Wave 1: Zero-Knowledge Age Verification Contract
// Privacy-first age verification without revealing personal data

program bliss_age_verification_v1.aleo {
    
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
    // Input: private VerificationRecord
    // Output: boolean confirmation without revealing record contents
    transition prove_possession(private verification_record: VerificationRecord) -> bool {
        // Verify record authenticity and ownership
        assert_eq(verification_record.owner, self.caller);
        assert_eq(verification_record.verified, true);
        
        // Return confirmation without revealing record data
        return true;
    }
}