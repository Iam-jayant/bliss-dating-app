// Bliss Wave 2: Privacy-Preserving Subscription Access Contract
// Simplified MVP version for deployment

program bliss_subscription_access.aleo {
    
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
    
    // Issue free tier subscription
    transition create_free_subscription() -> SubscriptionRecord {
        return SubscriptionRecord {
            owner: self.caller,
            tier: 0u8,
            expires_at: 0u32, // Never expires
            daily_swipe_limit: FREE_DAILY_SWIPES,
            max_active_chats: FREE_MAX_CHATS,
        };
    }
    
    // Upgrade to premium
    transition upgrade_to_premium(
        private old_subscription: SubscriptionRecord,
        private expiration: u32,
    ) -> SubscriptionRecord {
        // Verify ownership
        assert_eq(old_subscription.owner, self.caller);
        
        return SubscriptionRecord {
            owner: self.caller,
            tier: 1u8, // Premium
            expires_at: expiration,
            daily_swipe_limit: 0u32, // Unlimited
            max_active_chats: 0u32, // Unlimited
        };
    }
    
    // Upgrade to plus
    transition upgrade_to_plus(
        private old_subscription: SubscriptionRecord,
        private expiration: u32,
    ) -> SubscriptionRecord {
        // Verify ownership
        assert_eq(old_subscription.owner, self.caller);
        
        return SubscriptionRecord {
            owner: self.caller,
            tier: 2u8, // Plus
            expires_at: expiration,
            daily_swipe_limit: 0u32, // Unlimited
            max_active_chats: 0u32, // Unlimited
        };
    }
    
    // Create usage tracker
    transition create_usage_tracker(private current_date: u32) -> UsageRecord {
        return UsageRecord {
            owner: self.caller,
            date: current_date,
            swipes_used: 0u32,
            active_chats: 0u32,
        };
    }
    
    // Track swipe usage
    transition record_swipe(
        private subscription: SubscriptionRecord,
        private usage: UsageRecord,
        private current_date: u32,
    ) -> (SubscriptionRecord, UsageRecord) {
        // Verify ownership
        assert_eq(subscription.owner, self.caller);
        assert_eq(usage.owner, self.caller);
        
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
            owner: self.caller,
            date: current_date,
            swipes_used: swipes + 1u32,
            active_chats: usage.active_chats,
        };
        
        return (subscription, new_usage);
    }
}
