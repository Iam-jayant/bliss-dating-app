// Bliss Wave 2: Zero-Knowledge Compatibility Matching Contract
// Simplified MVP version for deployment

program bliss_compatibility_matching_v2.aleo {

    // Single-use ticket for recording an action exactly once.
    record ActionTicketRecord {
        owner: address,
        target: address,
        action: u8,
        issued_at: u32,
        expires_at: u32,
        nonce: u64,
    }
    
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
    
    // Issue a short-lived action ticket.
    transition issue_action_ticket(
        private owner: address,
        private target_user: address,
        private action_type: u8,
        private issued_at: u32,
        private expires_at: u32,
        private nonce: u64,
    ) -> ActionTicketRecord {
        assert_eq(owner, self.caller);
        assert(action_type <= 2u8);
        assert(issued_at > 0u32);
        assert(expires_at > issued_at);
        assert_neq(owner, target_user);

        return ActionTicketRecord {
            owner: owner,
            target: target_user,
            action: action_type,
            issued_at: issued_at,
            expires_at: expires_at,
            nonce: nonce,
        };
    }

    // Consume action ticket and materialize a match action record.
    transition record_action(
        private action_ticket: ActionTicketRecord,
        private current_time: u32,
    ) -> MatchRecord {
        assert_eq(action_ticket.owner, self.caller);
        assert(current_time >= action_ticket.issued_at);
        assert(current_time <= action_ticket.expires_at);

        return MatchRecord {
            owner: action_ticket.owner,
            target: action_ticket.target,
            action: action_ticket.action,
            timestamp: current_time,
        };
    }
    
    // Check for mutual match and compute compatibility
    transition create_mutual_match(
        private owner: address,
        private my_interests: u8,
        private their_interests: u8,
        private my_match_record: MatchRecord,
        private their_match_record: MatchRecord,
    ) -> MutualMatchRecord {
        // Verify I own my match record
        assert_eq(owner, self.caller);
        assert_eq(my_match_record.owner, owner);
        assert(my_match_record.timestamp > 0u32);
        assert(their_match_record.timestamp > 0u32);
        
        // Verify my action was a like/super-like
        assert(my_match_record.action >= 1u8);
        
        // Verify their record targets me
        assert_eq(their_match_record.target, owner);
        
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
            owner: owner,
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

