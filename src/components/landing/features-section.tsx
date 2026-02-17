'use client';

import { motion } from 'framer-motion';
import { Heart, ShieldCheck, MessageCircle, Download } from 'lucide-react';

const features = [
  {
    icon: Heart,
    title: 'Swipe with Intent',
    description: 'No infinite scroll addiction. Quality matches based on genuine compatibility, not engagement metrics.',
    highlight: 'Smart matching'
  },
  {
    icon: ShieldCheck,
    title: 'Verified, Not Surveilled',
    description: 'Prove you\'re over 18 without uploading your ID. Zero-knowledge proofs verify age while keeping data private.',
    highlight: 'ZK verification'
  },
  {
    icon: MessageCircle,
    title: 'Actually Private Messages',
    description: 'End-to-end encrypted conversations. Not even Bliss can read your messages. Your romance stays yours.',
    highlight: 'E2E encrypted'
  },
  {
    icon: Download,
    title: 'Your Data, Your Control',
    description: 'Export everything anytime. Delete your account for real. No hidden data retention or shadow profiles.',
    highlight: 'You own it'
  }
];

export function FeaturesSection() {
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
            Dating that <span className="text-primary">respects you</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you expect from a modern dating app, with none of the exploitation
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="group relative h-full rounded-2xl border border-border bg-card p-8 hover:border-primary/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
                {/* Background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-7 h-7" strokeWidth={2} />
                  </div>

                  {/* Badge */}
                  <div className="absolute top-0 right-0">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {feature.highlight}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-headline italic text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom text */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built on <span className="text-primary font-semibold">Aleo blockchain</span> with 
            zero-knowledge cryptography. Real privacy isn&apos;t a feature—it&apos;s the foundation.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
