'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for casual browsing',
    features: [
      '10 swipes per day',
      'Up to 3 active chats',
      'Age verification',
      'Basic matching',
      'End-to-end encryption'
    ],
    cta: 'Start Free',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Premium',
    price: '10',
    period: 'Aleo credits',
    priceSuffix: '≈ $9.99',
    description: 'Unlock the full experience',
    features: [
      'Unlimited swipes',
      'Unlimited chats',
      'See who liked you',
      '5 Super Likes per day',
      'Advanced filters',
    ],
    cta: 'Get Premium',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Plus',
    price: '20',
    period: 'Aleo credits',
    priceSuffix: '≈ $19.99',
    description: 'Everything, no limits',
    features: [
      'All Premium features',
      'Unlimited Super Likes',
      'Profile boost',
      'Read receipts',
      'VIP badge',
      'Priority matching',
    ],
    cta: 'Go Plus',
    highlighted: false,
    badge: 'Best Value',
  },
];

export function PricingSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-6 md:px-10 lg:px-16">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-headline italic text-foreground mb-4">
            Pricing that <span className="text-primary">makes sense</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            One-time purchases. No subscriptions. No hidden fees.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {tier.badge}
                  </span>
                </div>
              )}
              
              <div
                className={`relative h-full rounded-2xl border-2 p-8 transition-all duration-300 ${
                  tier.highlighted
                    ? 'border-primary bg-primary/5 shadow-xl scale-105'
                    : 'border-border bg-card hover:border-primary/50 hover:shadow-lg'
                }`}
              >
                <div className="mb-4">
                  <h3 className="text-2xl font-headline italic text-foreground mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-primary">{tier.price}</span>
                    <span className="text-muted-foreground">/{tier.period}</span>
                  </div>
                  {'priceSuffix' in tier && tier.priceSuffix && (
                    <p className="text-sm text-muted-foreground mt-1">{tier.priceSuffix}</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full rounded-full text-base py-6 ${
                    tier.highlighted
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg'
                      : 'bg-secondary hover:bg-secondary/90 text-foreground'
                  }`}
                >
                  {tier.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pay As You Go — x402 Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-2xl mx-auto mt-12"
        >
          <div className="relative rounded-2xl border-2 border-dashed border-border bg-card/50 p-8">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <Badge variant="secondary" className="text-sm font-semibold px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Coming Soon
              </Badge>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-headline italic text-foreground mb-2">Pay As You Go</h3>
              <p className="text-sm text-muted-foreground">Micro-payments via x402 — pay only for what you use</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Super Like', price: '$0.25' },
                { name: 'Profile Reveal', price: '$0.10' },
                { name: 'Undo Swipe', price: '$0.05' },
                { name: '24h Boost', price: '$1.99' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between bg-background/50 rounded-lg px-4 py-3">
                  <span className="text-foreground text-sm">{item.name}</span>
                  <span className="text-primary font-semibold text-sm">{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            All plans include full privacy protection • Powered by Aleo blockchain
          </p>
        </motion.div>
      </div>
    </section>
  );
}
