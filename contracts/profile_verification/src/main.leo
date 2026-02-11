// Bliss Wave 2: Privacy-First Profile Verification Contract
// Stores user profile data as private on-chain records

program bliss_profile_verification.aleo {
    
    // Interest categories for matching (8 categories, 4 max selected)
    // 0=Travel, 1=Fitness, 2=Music, 3=Art, 4=Food, 5=Tech, 6=Books, 7=Outdoors
    
    // Dating intent options
    // 0=LongTerm, 1=ShortTerm, 2=Friends, 3=OpenToExplore
    
    // Private profile record - contains encrypted personal preferences
    record ProfileRecord {
        owner: address,              // User's wallet address
        interests_bitfield: u8,      // 8 bits for 8 interest categories
        dating_intent: u8,           // 0-3 for dating intent
        location_geohash: u32,       // Geohash precision 5 (~5km radius)
        age_verified: bool,          // Must be true (gated by age_verification contract)
        premium_tier: u8,            // 0=Free, 1=Premium, 2=Plus
        profile_data_cid: field,     // IPFS CID hash for encrypted profile data
    }
    
    // Mapping to track profile existence (public state for discovery)
    mapping profiles: address => bool;
    
    // Mapping to track profile visibility zones (for location-based discovery)
    mapping location_zones: u32 => u32; // geohash -> count of users in zone
    
    // Constructor
    @noupgrade
    async constructor() {}
    
    // Create or update profile with private data
    transition create_profile(
        private interests: u8,           // Bitfield of selected interests (max 4 bits set)
        private intent: u8,              // Dating intent (0-3)
        private geohash: u32,            // Location zone (5km precision)
        private age_verified: bool,      // Must be true
        private profile_cid: field,      // IPFS CID for encrypted bio/name/images
    ) -> ProfileRecord {
        // Validate age verification
        assert(age_verified);
        
        // Validate interest count (max 4 interests, min 1)
        let interest_count: u8 = count_bits(interests);
        assert(interest_count >= 1u8);
        assert(interest_count <= 4u8);
        
        // Validate dating intent range
        assert(intent <= 3u8);
        
        // Create profile record
        let profile: ProfileRecord = ProfileRecord {
            owner: self.caller,
            interests_bitfield: interests,
            dating_intent: intent,
            location_geohash: geohash,
            age_verified: true,
            premium_tier: 0u8, // Start as free tier
            profile_data_cid: profile_cid,
        };
        
        return profile then finalize(self.caller, geohash);
    }
    
    // Finalize: Update public mappings for discovery
    async function finalize_create_profile(user: address, geohash: u32) {
        // Mark profile as existing
        Mapping::set(profiles, user, true);
        
        // Increment location zone counter
        let current_count: u32 = Mapping::get_or_use(location_zones, geohash, 0u32);
        Mapping::set(location_zones, geohash, current_count + 1u32);
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
        
        // Validate new interest count
        let interest_count: u8 = count_bits(new_interests);
        assert(interest_count >= 1u8);
        assert(interest_count <= 4u8);
        
        // Validate dating intent
        assert(new_intent <= 3u8);
        
        // Create updated profile record
        let updated_profile: ProfileRecord = ProfileRecord {
            owner: self.caller,
            interests_bitfield: new_interests,
            dating_intent: new_intent,
            location_geohash: new_geohash,
            age_verified: old_profile.age_verified, // Maintain verification
            premium_tier: old_profile.premium_tier,  // Maintain tier
            profile_data_cid: new_profile_cid,
        };
        
        return updated_profile then finalize(old_profile.location_geohash, new_geohash);
    }
    
    // Finalize: Update location zone counters
    async function finalize_update_profile(old_geohash: u32, new_geohash: u32) {
        // If location changed, update zone counters
        if (old_geohash != new_geohash) {
            // Decrement old zone
            let old_count: u32 = Mapping::get(location_zones, old_geohash);
            Mapping::set(location_zones, old_geohash, old_count - 1u32);
            
            // Increment new zone
            let new_count: u32 = Mapping::get_or_use(location_zones, new_geohash, 0u32);
            Mapping::set(location_zones, new_geohash, new_count + 1u32);
        }
    }
    
    // Prove profile has specific interest without revealing others
    transition prove_interest(
        private profile: ProfileRecord,
        private target_interest: u8,  // Interest ID (0-7)
    ) -> (bool, ProfileRecord) {
        // Verify ownership
        assert_eq(profile.owner, self.caller);
        
        // Create bitmask for target interest
        let mask: u8 = 1u8 << target_interest;
        
        // Check if interest is set
        let has_interest: bool = (profile.interests_bitfield & mask) != 0u8;
        
        // Return result + new profile record (reusable pattern)
        return (has_interest, profile);
    }
    
    // Prove location proximity without revealing exact location
    transition prove_proximity(
        private profile: ProfileRecord,
        private target_geohash: u32,
        private max_distance: u32,      // Distance threshold in geohash units
    ) -> (bool, ProfileRecord) {
        // Verify ownership
        assert_eq(profile.owner, self.caller);
        
        // Calculate geohash distance (simplified: absolute difference)
        let distance: u32 = geohash_distance(profile.location_geohash, target_geohash);
        
        // Check if within range
        let is_nearby: bool = distance <= max_distance;
        
        // Return result + new profile record
        return (is_nearby, profile);
    }
    
    // Helper: Count set bits in bitfield (interest count)
    function count_bits(bitfield: u8) -> u8 {
        let count: u8 = 0u8;
        let temp: u8 = bitfield;
        
        // Count bits using Brian Kernighan's algorithm
        // Loop up to 8 times (one per bit)
        for i: u8 in 0u8..8u8 {
            if (temp == 0u8) {
                return count;
            }
            temp = temp & (temp - 1u8);
            count = count + 1u8;
        }
        
        return count;
    }
    
    // Helper: Calculate geohash distance (simplified)
    function geohash_distance(hash1: u32, hash2: u32) -> u32 {
        // Absolute difference as proxy for distance
        if (hash1 > hash2) {
            return hash1 - hash2;
        } else {
            return hash2 - hash1;
        }
    }
}
