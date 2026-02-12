// Bliss Wave 2: Zero-Knowledge Compatibility Matching Contract
// Simplified MVP version for deployment

program bliss_compatibility_matching.aleo {
    
    // Private match record - stores user's action on another profile
    record MatchRecord {
        owner: address,           // User who performed the action
        target: address,          // Profile being matched
        action: u8,               // 0=Pass, 1=Like, 2=SuperLike
        timestamp: u32,           // When action was performed
    }
    
    // Private mutual match record
    record MutualMatchRecord {
        owner: address,           // One of the matched users
        matched_with: address,    // The other matched user
        shared_interests: u8,     // Bitfield of shared interests
        compatibility_score: u8,  // Score (0-100)
        timestamp: u32,           // When match was created
    }
    
    @noupgrade
    async constructor() {}
    
    // Record a like/pass action
    transition record_action(
        private target_user: address,
        private action_type: u8,
        private current_time: u32,
    ) -> MatchRecord {
        // Validate action type
        assert(action_type <= 2u8);
        
        // Cannot match with self
        assert_neq(self.caller, target_user);
        
        // Create match record
        return MatchRecord {
            owner: self.caller,
            target: target_user,
            action: action_type,
            timestamp: current_time,
        };
    }
    
    // Check for mutual match and compute compatibility
    transition create_mutual_match(
        private my_interests: u8,
        private their_interests: u8,
        private my_match_record: MatchRecord,
        private their_match_record: MatchRecord,
    ) -> MutualMatchRecord {
        // Verify I own my match record
        assert_eq(my_match_record.owner, self.caller);
        
        // Verify my action was a like/super-like
        assert(my_match_record.action >= 1u8);
        
        // Verify their record targets me
        assert_eq(their_match_record.target, self.caller);
        
        // Verify their action was also a like/super-like
        assert(their_match_record.action >= 1u8);
        
        // Verify records reference each other
        assert_eq(my_match_record.target, their_match_record.owner);
        
        // Compute ONLY shared interests (bitwise AND)
        let shared_interests: u8 = my_interests & their_interests;
        
        // Compute simple compatibility score
        let compatibility: u8 = compute_score(shared_interests);
        
        // Create mutual match record
        return MutualMatchRecord {
            owner: self.caller,
            matched_with: my_match_record.target,
            shared_interests: shared_interests,
            compatibility_score: compatibility,
            timestamp: my_match_record.timestamp,
        };
    }
    
    // Helper: Compute compatibility score
    inline compute_score(shared: u8) -> u8 {
        let count: u8 = count_bits(shared);
        if (count >= 4u8) {
            return 100u8;
        } else if (count == 3u8) {
            return 75u8;
        } else if (count == 2u8) {
            return 50u8;
        } else if (count == 1u8) {
            return 25u8;
        } else {
            return 0u8;
        }
    }
    
    // Helper: Count set bits
    inline count_bits(bitfield: u8) -> u8 {
        let count: u8 = 0u8;
        let temp: u8 = bitfield;
        
        if ((temp & 1u8) != 0u8) { count = count + 1u8; }
        temp = temp >> 1u8;
        if ((temp & 1u8) != 0u8) { count = count + 1u8; }
        temp = temp >> 1u8;
        if ((temp & 1u8) != 0u8) { count = count + 1u8; }
        temp = temp >> 1u8;
        if ((temp & 1u8) != 0u8) { count = count + 1u8; }
        temp = temp >> 1u8;
        if ((temp & 1u8) != 0u8) { count = count + 1u8; }
        temp = temp >> 1u8;
        if ((temp & 1u8) != 0u8) { count = count + 1u8; }
        temp = temp >> 1u8;
        if ((temp & 1u8) != 0u8) { count = count + 1u8; }
        temp = temp >> 1u8;
        if ((temp & 1u8) != 0u8) { count = count + 1u8; }
        
        return count;
    }
}
