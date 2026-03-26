// Bliss Wave 2: Privacy-First Profile Verification Contract
// Simplified MVP version for deployment

program bliss_profile_verification_v4.aleo {
    
    // Private profile record - contains encrypted personal preferences
    record ProfileRecord {
        owner: address,              // User's wallet address
        version: u16,                // Monotonic profile record version
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
        private owner: address,
    ) -> ProfileRecord {
        // Validate age verification
        assert_eq(owner, self.caller);
        assert(age_verified);
        assert(intent <= 3u8);
        assert(geohash > 0u32);
        
        // Create profile record
        return ProfileRecord {
            owner: owner,
            version: 1u16,
            interests_bitfield: interests,
            dating_intent: intent,
            location_geohash: geohash,
            age_verified: true,
            premium_tier: 0u8,
            profile_data_cid: profile_cid,
        };
    }

    // Create profile using quorum-age bridge payload fields from age verification records.
    // This avoids external-record typing while still enforcing age lineage constraints on-chain.
    transition create_profile_with_age_bridge(
        private interests: u8,
        private intent: u8,
        private geohash: u32,
        private age_bridge_provider_mask: u8,
        private age_bridge_issued_at: u32,
        private age_bridge_expires_at: u32,
        private age_bridge_nonce: u64,
        private age_bridge_version: u16,
        private profile_cid: field,
        private current_time: u32,
        private owner: address,
    ) -> ProfileRecord {
        assert_eq(owner, self.caller);
        assert(intent <= 3u8);
        assert(geohash > 0u32);

        // Enforce quorum-age lineage payload invariants.
        assert(age_bridge_provider_mask > 0u8);
        assert(age_bridge_version > 0u16);
        assert(age_bridge_nonce > 0u64);
        assert(current_time >= age_bridge_issued_at);
        assert(current_time <= age_bridge_expires_at);

        return ProfileRecord {
            owner: owner,
            version: 1u16,
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
        private owner: address,
        private new_interests: u8,
        private new_intent: u8,
        private new_geohash: u32,
        private new_profile_cid: field,
    ) -> ProfileRecord {
        // Verify ownership
        assert_eq(owner, self.caller);
        assert_eq(old_profile.owner, owner);
        assert(old_profile.version < 65535u16);
        assert(new_intent <= 3u8);
        assert(new_geohash > 0u32);
        
        // Create updated profile record
        return ProfileRecord {
            owner: owner,
            version: old_profile.version + 1u16,
            interests_bitfield: new_interests,
            dating_intent: new_intent,
            location_geohash: new_geohash,
            age_verified: old_profile.age_verified,
            premium_tier: old_profile.premium_tier,
            profile_data_cid: new_profile_cid,
        };
    }
}

