'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const comparisonData = [
  {
    category: 'Your Data',
    traditional: 'Sold to advertisers',
    bliss: 'End-to-end encrypted',
    traditionalbad: true
  },
  {
    category: 'Privacy',
    traditional: 'Public profiles tracked',
    bliss: 'Zero-knowledge proofs',
    traditionalbad: true
  },
  {
    category: 'Costs',
    traditional: '$20-50/month subscription',
    bliss: 'Free or pay $0.10/match',
    traditionalbad: true
  },
  {
    category: 'Algorithm',
    traditional: 'Addictive engagement loops',
    bliss: 'Quality over quantity',
    traditionalbad: true
  },
  {
    category: 'Verification',
    traditional: 'Photos can be fake',
    bliss: 'Verified age without ID',
    traditionalbad: true
  },
  {
    category: 'Messages',
    traditional: 'Scanned for moderation',
    bliss: 'Truly private, decrypted',
    traditionalbad: true
  }
];

export function ComparisonSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/20">
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
            Dating apps are <span className="text-primary">broken</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            You shouldn&apos;t have to choose between finding love and protecting your privacy
          </p>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          {/* Desktop view */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-border shadow-xl">
            <div className="grid grid-cols-3 bg-card">
              {/* Headers */}
              <div className="p-6 border-b border-border">
                <div className="text-lg font-semibold text-muted-foreground">Feature</div>
              </div>
              <div className="p-6 border-b border-l border-border bg-muted/30">
                <div className="text-lg font-semibold text-muted-foreground">Traditional Apps</div>
              </div>
              <div className="p-6 border-b border-l border-primary/20 bg-primary/5">
                <div className="text-lg font-semibold text-primary flex items-center gap-2">
                  Bliss
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Better
                  </span>
                </div>
              </div>

              {/* Rows */}
              {comparisonData.map((row, index) => (
                <motion.div
                  key={row.category}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="contents"
                >
                  <div className="p-6 border-b border-border font-semibold">
                    {row.category}
                  </div>
                  <div className="p-6 border-b border-l border-border bg-muted/30">
                    <div className="flex items-start gap-2">
                      <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{row.traditional}</span>
                    </div>
                  </div>
                  <div className="p-6 border-b border-l border-primary/20 bg-primary/5">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{row.bliss}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-4">
            {comparisonData.map((row, index) => (
              <motion.div
                key={row.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-lg"
              >
                <div className="p-4 bg-muted/30 border-b border-border">
                  <div className="font-semibold text-foreground">{row.category}</div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-1" />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Traditional</div>
                      <div className="text-sm text-muted-foreground">{row.traditional}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <div className="text-xs text-primary mb-1">Bliss</div>
                      <div className="text-sm text-foreground">{row.bliss}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-lg text-muted-foreground">
            The choice is clear. <span className="text-primary font-semibold">Date with dignity.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
