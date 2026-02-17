'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for casual browsing',
    features: [
      'Create profile & browse',
      'Limited swipes per day',
      'Age verification',
      'Basic matching',
      'End-to-end encryption'
    ],
    cta: 'Start Free',
    highlighted: false
  },
  {
    name: 'Pay-as-you-go',
    price: '$0.10',
    period: 'per match',
    description: 'Only pay when you connect',
    features: [
      'Unlimited browsing',
      'Pay only for matches',
      'Advanced compatibility',
      'Priority support',
      'No monthly commitment',
      'Full privacy features'
    ],
    cta: 'Start Matching',
    highlighted: true,
    badge: 'Most Flexible'
  },
  {
    name: 'Premium',
    price: '$12',
    period: 'per month',
    description: 'For serious daters',
    features: [
      'Unlimited everything',
      'See who liked you',
      'Advanced filters',
      'Rewind swipes',
      'Profile boost',
      'Read receipts',
      'Priority matching'
    ],
    cta: 'Go Premium',
    highlighted: false
  }
];

export function PricingSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-6 md:px-10 lg:px-16">
        
        {/* Section header */}
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
            No hidden fees. No forced subscriptions. Pay for value, not engagement.
          </p>
        </motion.div>

        {/* Pricing cards */}
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
                {/* Tier name */}
                <div className="mb-4">
                  <h3 className="text-2xl font-headline italic text-foreground mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-primary">{tier.price}</span>
                    <span className="text-muted-foreground">/{tier.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
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

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            All plans include full privacy protection • Cancel anytime • No questions asked
          </p>
        </motion.div>
      </div>
    </section>
  );
}
