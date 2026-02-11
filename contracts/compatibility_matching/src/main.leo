// Bliss Wave 2: Zero-Knowledge Compatibility Matching Contract
// Proves shared interests without revealing non-matching preferences

program bliss_compatibility_matching.aleo {
    
    // Match action types
    // 0=Pass, 1=Like, 2=SuperLike
    
    // Private match record - stores user's action on another profile
    record MatchRecord {
        owner: address,           // User who performed the action
        target: address,          // Profile being matched
        action: u8,               // 0=Pass, 1=Like, 2=SuperLike
        timestamp: u32,           // When action was performed
        match_revealed: bool,     // Whether this created a mutual match
    }
    
    // Private mutual match record - issued when both users like each other
    record MutualMatchRecord {
        owner: address,           // One of the matched users
        matched_with: address,    // The other matched user
        shared_interests: u8,     // Bitfield of ONLY shared interests
        compatibility_score: u8,  // ZK-computed score (0-100)
        timestamp: u32,           // When match was created
    }
    
    // Public mapping: track if two users have mutually matched (for discovery)
    mapping mutual_matches: field => bool; // hash(user1, user2) -> is_matched
    
    // Public mapping: track match counts per user (for rate limiting)
    mapping match_counts: address => u32;
    
    // Constructor
    @noupgrade
    async constructor() {}
    
    // Record a like/pass action
    transition record_action(
        private target_user: address,
        private action_type: u8,          // 0=Pass, 1=Like, 2=SuperLike
        private current_time: u32,
    ) -> MatchRecord {
        // Validate action type
        assert(action_type <= 2u8);
        
        // Cannot match with self
        assert_neq(self.caller, target_user);
        
        // Create match record
        let match_record: MatchRecord = MatchRecord {
            owner: self.caller,
            target: target_user,
            action: action_type,
            timestamp: current_time,
            match_revealed: false,
        };
        
        return match_record then finalize(self.caller, target_user, action_type);
    }
    
    // Finalize: Track match count
    async function finalize_record_action(user: address, target: address, action: u8) {
        // Only count likes/super-likes, not passes
        if (action >= 1u8) {
            let current_count: u32 = Mapping::get_or_use(match_counts, user, 0u32);
            Mapping::set(match_counts, user, current_count + 1u32);
        }
    }
    
    // Check for mutual match and compute compatibility
    transition check_mutual_match(
        private my_profile_interests: u8,      // My interests bitfield
        private my_match_record: MatchRecord,  // My like action
        private their_match_record: MatchRecord, // Their like action (if exists)
    ) -> (bool, MutualMatchRecord, MatchRecord) {
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
        
        // Extract their interests from their profile (passed as witness)
        let their_profile_interests: u8 = extract_interests(their_match_record);
        
        // Compute ONLY shared interests (bitwise AND)
        let shared_interests: u8 = my_profile_interests & their_profile_interests;
        
        // Compute compatibility score (0-100 based on shared interests)
        let compatibility: u8 = compute_compatibility_score(shared_interests);
        
        // Create mutual match record
        let mutual_match: MutualMatchRecord = MutualMatchRecord {
            owner: self.caller,
            matched_with: my_match_record.target,
            shared_interests: shared_interests, // ONLY reveals shared interests
            compatibility_score: compatibility,
            timestamp: my_match_record.timestamp,
        };
        
        // Update my match record to mark match as revealed
        let updated_match_record: MatchRecord = MatchRecord {
            owner: my_match_record.owner,
            target: my_match_record.target,
            action: my_match_record.action,
            timestamp: my_match_record.timestamp,
            match_revealed: true,
        };
        
        // Return: is_match=true, mutual_match_record, updated_match_record
        return (true, mutual_match, updated_match_record) then finalize(
            self.caller,
            my_match_record.target
        );
    }
    
    // Finalize: Record mutual match publicly
    async function finalize_check_mutual_match(user1: address, user2: address) {
        // Create deterministic hash for the pair (order-independent)
        let match_hash: field = create_match_hash(user1, user2);
        
        // Mark as mutually matched
        Mapping::set(mutual_matches, match_hash, true);
    }
    
    // Prove shared interest count without revealing which interests
    transition prove_shared_interests(
        private mutual_match: MutualMatchRecord,
        private minimum_shared: u8,
    ) -> (bool, MutualMatchRecord) {
        // Verify ownership
        assert_eq(mutual_match.owner, self.caller);
        
        // Count shared interests
        let shared_count: u8 = count_bits(mutual_match.shared_interests);
        
        // Check if meets minimum threshold
        let meets_threshold: bool = shared_count >= minimum_shared;
        
        // Return result + reusable record
        return (meets_threshold, mutual_match);
    }
    
    // Helper: Extract interests from match record (witness pattern)
    // In practice, this would be passed as a separate private input
    function extract_interests(match_record: MatchRecord) -> u8 {
        // Simplified: In real implementation, interests would be passed
        // as additional private witness and verified against profile hash
        return 0u8; // Placeholder
    }
    
    // Helper: Compute compatibility score based on shared interests
    function compute_compatibility_score(shared_interests: u8) -> u8 {
        let shared_count: u8 = count_bits(shared_interests);
        
        // Score formula: (shared_interests / 4) * 100
        // Max 4 interests, so 4 shared = 100% compatibility
        if (shared_count == 4u8) {
            return 100u8;
        } else if (shared_count == 3u8) {
            return 75u8;
        } else if (shared_count == 2u8) {
            return 50u8;
        } else if (shared_count == 1u8) {
            return 25u8;
        } else {
            return 0u8;
        }
    }
    
    // Helper: Count set bits
    function count_bits(bitfield: u8) -> u8 {
        let count: u8 = 0u8;
        let temp: u8 = bitfield;
        
        for i: u8 in 0u8..8u8 {
            if (temp == 0u8) {
                return count;
            }
            temp = temp & (temp - 1u8);
            count = count + 1u8;
        }
        
        return count;
    }
    
    // Helper: Create order-independent hash for user pair
    function create_match_hash(user1: address, user2: address) -> field {
        // Simplified: concatenate addresses in deterministic order
        // In practice, use proper hash function
        if (user1.to_field() < user2.to_field()) {
            return BHP256::hash_to_field(user1.to_field(), user2.to_field());
        } else {
            return BHP256::hash_to_field(user2.to_field(), user1.to_field());
        }
    }
}
