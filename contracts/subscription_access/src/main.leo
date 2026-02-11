// Bliss Wave 2: Privacy-Preserving Subscription Access Contract
// Manages premium tier access with ZK proof of subscription status

program bliss_subscription_access.aleo {
    
    // Subscription tier levels
    // 0=Free (10 swipes/day, 3 active chats)
    // 1=Premium (unlimited swipes, unlimited chats, advanced filters)
    // 2=Plus (Premium + priority visibility, read receipts)
    
    // Private subscription record - proves tier without revealing payment details
    record SubscriptionRecord {
        owner: address,           // User who owns subscription
        tier: u8,                 // 0=Free, 1=Premium, 2=Plus
        expires_at: u32,          // Expiration timestamp (0 for free tier)
        daily_swipe_limit: u32,   // Swipe limit (0 = unlimited)
        max_active_chats: u32,    // Chat limit (0 = unlimited)
    }
    
    // Private usage tracking record - tracks daily limits
    record UsageRecord {
        owner: address,           // User who owns this usage tracker
        date: u32,                // Current date (YYYYMMDD format)
        swipes_used: u32,         // Swipes used today
        active_chats: u32,        // Currently active chat count
    }
    
    // Public mapping: track subscription counts by tier (analytics)
    mapping subscription_tiers: u8 => u32;
    
    // Public mapping: track total revenue (for transparency)
    mapping total_revenue: u8 => u64; // tier -> total credits paid
    
    // Subscription pricing (in Aleo credits)
    const PREMIUM_MONTHLY_PRICE: u64 = 10_000_000u64; // 10 Aleo credits
    const PLUS_MONTHLY_PRICE: u64 = 20_000_000u64;    // 20 Aleo credits
    
    // Free tier limits
    const FREE_DAILY_SWIPES: u32 = 10u32;
    const FREE_MAX_CHATS: u32 = 3u32;
    
    // Constructor
    @noupgrade
    async constructor() {}
    
    // Issue free tier subscription (default for all users)
    transition create_free_subscription() -> SubscriptionRecord {
        let subscription: SubscriptionRecord = SubscriptionRecord {
            owner: self.caller,
            tier: 0u8,
            expires_at: 0u32, // Never expires
            daily_swipe_limit: FREE_DAILY_SWIPES,
            max_active_chats: FREE_MAX_CHATS,
        };
        
        return subscription then finalize(0u8);
    }
    
    // Finalize: Track free tier creation
    async function finalize_create_free_subscription(tier: u8) {
        let current_count: u32 = Mapping::get_or_use(subscription_tiers, tier, 0u32);
        Mapping::set(subscription_tiers, tier, current_count + 1u32);
    }
    
    // Upgrade to Premium tier (requires payment)
    transition upgrade_to_premium(
        private old_subscription: SubscriptionRecord,
        private payment_amount: u64,
        private duration_months: u32,
        private current_time: u32,
    ) -> SubscriptionRecord {
        // Verify ownership
        assert_eq(old_subscription.owner, self.caller);
        
        // Validate payment amount (simplified - in production, use token transfer)
        let required_payment: u64 = PREMIUM_MONTHLY_PRICE * duration_months.to_u64();
        assert(payment_amount >= required_payment);
        
        // Calculate expiration (30 days per month)
        let expiration: u32 = current_time + (duration_months * 30u32 * 86400u32);
        
        // Issue Premium subscription
        let premium_subscription: SubscriptionRecord = SubscriptionRecord {
            owner: self.caller,
            tier: 1u8,
            expires_at: expiration,
            daily_swipe_limit: 0u32, // Unlimited
            max_active_chats: 0u32,  // Unlimited
        };
        
        return premium_subscription then finalize(1u8, payment_amount);
    }
    
    // Finalize: Track premium upgrades and revenue
    async function finalize_upgrade_to_premium(tier: u8, payment: u64) {
        // Update tier counts
        let current_count: u32 = Mapping::get_or_use(subscription_tiers, tier, 0u32);
        Mapping::set(subscription_tiers, tier, current_count + 1u32);
        
        // Track revenue
        let current_revenue: u64 = Mapping::get_or_use(total_revenue, tier, 0u64);
        Mapping::set(total_revenue, tier, current_revenue + payment);
    }
    
    // Upgrade to Plus tier (requires payment)
    transition upgrade_to_plus(
        private old_subscription: SubscriptionRecord,
        private payment_amount: u64,
        private duration_months: u32,
        private current_time: u32,
    ) -> SubscriptionRecord {
        // Verify ownership
        assert_eq(old_subscription.owner, self.caller);
        
        // Validate payment amount
        let required_payment: u64 = PLUS_MONTHLY_PRICE * duration_months.to_u64();
        assert(payment_amount >= required_payment);
        
        // Calculate expiration
        let expiration: u32 = current_time + (duration_months * 30u32 * 86400u32);
        
        // Issue Plus subscription
        let plus_subscription: SubscriptionRecord = SubscriptionRecord {
            owner: self.caller,
            tier: 2u8,
            expires_at: expiration,
            daily_swipe_limit: 0u32, // Unlimited
            max_active_chats: 0u32,  // Unlimited
        };
        
        return plus_subscription then finalize(2u8, payment_amount);
    }
    
    // Finalize: Track plus upgrades and revenue
    async function finalize_upgrade_to_plus(tier: u8, payment: u64) {
        let current_count: u32 = Mapping::get_or_use(subscription_tiers, tier, 0u32);
        Mapping::set(subscription_tiers, tier, current_count + 1u32);
        
        let current_revenue: u64 = Mapping::get_or_use(total_revenue, tier, 0u64);
        Mapping::set(total_revenue, tier, current_revenue + payment);
    }
    
    // Prove subscription tier without revealing exact tier
    transition prove_premium_access(
        private subscription: SubscriptionRecord,
        private current_time: u32,
    ) -> (bool, SubscriptionRecord) {
        // Verify ownership
        assert_eq(subscription.owner, self.caller);
        
        // Check if subscription is active (not expired)
        let is_active: bool = subscription.expires_at == 0u32 || subscription.expires_at > current_time;
        
        // Check if tier is premium or above
        let has_premium: bool = is_active && subscription.tier >= 1u8;
        
        // Return result + reusable subscription record
        return (has_premium, subscription);
    }
    
    // Check swipe limit and consume one swipe
    transition consume_swipe(
        private subscription: SubscriptionRecord,
        private usage: UsageRecord,
        private current_date: u32, // YYYYMMDD format
    ) -> (bool, SubscriptionRecord, UsageRecord) {
        // Verify ownership
        assert_eq(subscription.owner, self.caller);
        assert_eq(usage.owner, self.caller);
        
        // Reset usage if new day
        let actual_swipes: u32 = if (usage.date != current_date) {
            0u32 // New day, reset counter
        } else {
            usage.swipes_used
        };
        
        // Check if user can swipe
        let can_swipe: bool = if (subscription.daily_swipe_limit == 0u32) {
            true // Unlimited
        } else {
            actual_swipes < subscription.daily_swipe_limit
        };
        
        // Create updated usage record
        let new_usage: UsageRecord = UsageRecord {
            owner: self.caller,
            date: current_date,
            swipes_used: if (can_swipe) { actual_swipes + 1u32 } else { actual_swipes },
            active_chats: usage.active_chats,
        };
        
        // Return: can_swipe, subscription, updated_usage
        return (can_swipe, subscription, new_usage);
    }
    
    // Check chat limit
    transition check_chat_limit(
        private subscription: SubscriptionRecord,
        private usage: UsageRecord,
    ) -> (bool, SubscriptionRecord, UsageRecord) {
        // Verify ownership
        assert_eq(subscription.owner, self.caller);
        assert_eq(usage.owner, self.caller);
        
        // Check if user can start new chat
        let can_chat: bool = if (subscription.max_active_chats == 0u32) {
            true // Unlimited
        } else {
            usage.active_chats < subscription.max_active_chats
        };
        
        // Return: can_chat, subscription, usage
        return (can_chat, subscription, usage);
    }
    
    // Create initial usage tracker
    transition create_usage_tracker(private current_date: u32) -> UsageRecord {
        let usage: UsageRecord = UsageRecord {
            owner: self.caller,
            date: current_date,
            swipes_used: 0u32,
            active_chats: 0u32,
        };
        
        return usage;
    }
}
