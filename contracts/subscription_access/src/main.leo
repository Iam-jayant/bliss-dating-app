// Bliss Wave 2: Privacy-Preserving Subscription Access Contract
// Simplified MVP version for deployment

program bliss_subscription_access_v2.aleo {

    // Single-use operation ticket for replay-safe transitions.
    record OperationTicketRecord {
        owner: address,
        op_type: u8,          // 1=premium upgrade, 2=plus upgrade, 3=record swipe
        issued_at: u32,
        expires_at: u32,
        nonce: u64,
    }
    
    // Private subscription record
    record SubscriptionRecord {
        owner: address,           // User who owns subscription
        tier: u8,                 // 0=Free, 1=Premium, 2=Plus
        expires_at: u32,          // Expiration timestamp
        daily_swipe_limit: u32,   // Swipe limit (0 = unlimited)
        max_active_chats: u32,    // Chat limit (0 = unlimited)
    }
    
    // Private usage tracking record
    record UsageRecord {
        owner: address,           // User who owns this usage tracker
        date: u32,                // Current date (YYYYMMDD format)
        swipes_used: u32,         // Swipes used today
        active_chats: u32,        // Currently active chat count
    }
    
    @noupgrade
    async constructor() {}
    
    // Free tier limits
    const FREE_DAILY_SWIPES: u32 = 10u32;
    const FREE_MAX_CHATS: u32 = 3u32;

    transition issue_operation_ticket(
        private owner: address,
        private op_type: u8,
        private issued_at: u32,
        private expires_at: u32,
        private nonce: u64,
    ) -> OperationTicketRecord {
        assert_eq(owner, self.caller);
        assert(op_type >= 1u8);
        assert(op_type <= 3u8);
        assert(issued_at > 0u32);
        assert(expires_at > issued_at);

        return OperationTicketRecord {
            owner: owner,
            op_type: op_type,
            issued_at: issued_at,
            expires_at: expires_at,
            nonce: nonce,
        };
    }
    
    // Issue free tier subscription
    transition create_free_subscription(private owner: address) -> SubscriptionRecord {
        assert_eq(owner, self.caller);
        return SubscriptionRecord {
            owner: owner,
            tier: 0u8,
            expires_at: 0u32, // Never expires
            daily_swipe_limit: FREE_DAILY_SWIPES,
            max_active_chats: FREE_MAX_CHATS,
        };
    }
    
    // Upgrade to premium
    transition upgrade_to_premium(
        private old_subscription: SubscriptionRecord,
        private op_ticket: OperationTicketRecord,
        private owner: address,
        private expiration: u32,
        private current_time: u32,
    ) -> SubscriptionRecord {
        // Verify ownership
        assert_eq(owner, self.caller);
        assert_eq(old_subscription.owner, owner);
        assert_eq(op_ticket.owner, owner);
        assert_eq(op_ticket.op_type, 1u8);
        assert(current_time >= op_ticket.issued_at);
        assert(current_time <= op_ticket.expires_at);
        assert(expiration >= current_time);
        assert(expiration >= op_ticket.issued_at);
        assert(expiration >= op_ticket.expires_at);
        assert(expiration > 0u32);
        
        return SubscriptionRecord {
            owner: owner,
            tier: 1u8, // Premium
            expires_at: expiration,
            daily_swipe_limit: 0u32, // Unlimited
            max_active_chats: 0u32, // Unlimited
        };
    }
    
    // Upgrade to plus
    transition upgrade_to_plus(
        private old_subscription: SubscriptionRecord,
        private op_ticket: OperationTicketRecord,
        private owner: address,
        private expiration: u32,
        private current_time: u32,
    ) -> SubscriptionRecord {
        // Verify ownership
        assert_eq(owner, self.caller);
        assert_eq(old_subscription.owner, owner);
        assert_eq(op_ticket.owner, owner);
        assert_eq(op_ticket.op_type, 2u8);
        assert(current_time >= op_ticket.issued_at);
        assert(current_time <= op_ticket.expires_at);
        assert(expiration >= current_time);
        assert(expiration >= op_ticket.issued_at);
        assert(expiration >= op_ticket.expires_at);
        assert(expiration > 0u32);
        
        return SubscriptionRecord {
            owner: owner,
            tier: 2u8, // Plus
            expires_at: expiration,
            daily_swipe_limit: 0u32, // Unlimited
            max_active_chats: 0u32, // Unlimited
        };
    }
    
    // Create usage tracker
    transition create_usage_tracker(private owner: address, private current_date: u32) -> UsageRecord {
        assert_eq(owner, self.caller);
        // YYYYMMDD sanity range.
        assert(current_date >= 20000101u32);
        assert(current_date <= 29991231u32);

        return UsageRecord {
            owner: owner,
            date: current_date,
            swipes_used: 0u32,
            active_chats: 0u32,
        };
    }
    
    // Track swipe usage
    transition record_swipe(
        private subscription: SubscriptionRecord,
        private usage: UsageRecord,
        private op_ticket: OperationTicketRecord,
        private owner: address,
        private current_date: u32,
        private current_time: u32,
    ) -> (SubscriptionRecord, UsageRecord) {
        // Verify ownership
        assert_eq(owner, self.caller);
        assert_eq(subscription.owner, owner);
        assert_eq(usage.owner, owner);
        assert_eq(op_ticket.owner, owner);
        assert_eq(op_ticket.op_type, 3u8);
        assert(current_time >= op_ticket.issued_at);
        assert(current_time <= op_ticket.expires_at);
        assert(subscription.tier <= 2u8);

        // YYYYMMDD sanity checks.
        assert(current_date >= 20000101u32);
        assert(current_date <= 29991231u32);
        assert(usage.date >= 20000101u32);
        assert(usage.date <= 29991231u32);
        assert(current_date >= usage.date);
        
        // Reset counter if new day
        let swipes: u32 = usage.swipes_used;
        if (usage.date != current_date) {
            swipes = 0u32;
        }
        
        // Check limit (0 means unlimited)
        if (subscription.daily_swipe_limit != 0u32) {
            assert(swipes < subscription.daily_swipe_limit);
        }
        
        // Create updated records
        let new_usage: UsageRecord = UsageRecord {
            owner: owner,
            date: current_date,
            swipes_used: swipes + 1u32,
            active_chats: usage.active_chats,
        };
        
        return (subscription, new_usage);
    }
}

