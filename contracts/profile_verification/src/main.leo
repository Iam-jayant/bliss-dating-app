// Bliss Wave 2: Privacy-First Profile Verification Contract
// Simplified MVP version for deployment

program bliss_profile_verification.aleo {
    
    // Private profile record - contains encrypted personal preferences
    record ProfileRecord {
        owner: address,              // User's wallet address
        interests_bitfield: u8,      // 8 bits for 8 interest categories
        dating_intent: u8,           // 0-3 for dating intent
        location_geohash: u32,       // Geohash precision 5 (~5km radius)
        age_verified: bool,          // Must be true
        premium_tier: u8,            // 0=Free, 1=Premium, 2=Plus
        profile_data_cid: field,     // IPFS CID hash
    }
    
    @noupgrade
    async constructor() {}
    
    // Create profile with private data
    transition create_profile(
        private interests: u8,
        private intent: u8,
        private geohash: u32,
        private age_verified: bool,
        private profile_cid: field,
    ) -> ProfileRecord {
        // Validate age verification
        assert(age_verified);
        
        // Create profile record
        return ProfileRecord {
            owner: self.caller,
            interests_bitfield: interests,
            dating_intent: intent,
            location_geohash: geohash,
            age_verified: true,
            premium_tier: 0u8,
            profile_data_cid: profile_cid,
        };
    }
    
    // Update profile (consumes old record, returns new one)
    transition update_profile(
        private old_profile: ProfileRecord,
        private new_interests: u8,
        private new_intent: u8,
        private new_geohash: u32,
        private new_profile_cid: field,
    ) -> ProfileRecord {
        // Verify ownership
        assert_eq(old_profile.owner, self.caller);
        
        // Create updated profile record
        return ProfileRecord {
            owner: self.caller,
            interests_bitfield: new_interests,
            dating_intent: new_intent,
            location_geohash: new_geohash,
            age_verified: old_profile.age_verified,
            premium_tier: old_profile.premium_tier,
            profile_data_cid: new_profile_cid,
        };
    }
}
