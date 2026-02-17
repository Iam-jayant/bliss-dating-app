'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function FinalCTASection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-accent/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 md:px-10 lg:px-16 relative">
        <div className="max-w-4xl mx-auto">
          
          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <span className="text-sm font-semibold text-primary bg-primary/10 px-4 py-2 rounded-full">
                🎉 Launching Soon
              </span>
            </motion.div>

            {/* Headline */}
            <h2 className="text-4xl md:text-6xl font-headline italic text-foreground leading-tight">
              Ready to date <span className="text-primary">differently?</span>
            </h2>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Join the waitlist for early access. Be among the first to experience dating with <span className="text-primary font-semibold">real privacy</span>.
            </p>

            {/* Email signup form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="max-w-md mx-auto"
            >
              <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-full bg-card border border-border shadow-lg">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="pl-12 pr-4 py-6 rounded-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Button 
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 shadow-lg"
                >
                  Join Waitlist
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                🔒 We&apos;ll never share your email. Unsubscribe anytime.
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-wrap justify-center gap-8 pt-8"
            >
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-headline italic text-primary mb-1">2,500+</div>
                <div className="text-sm text-muted-foreground">On the waitlist</div>
              </div>
              <div className="w-px bg-border hidden sm:block" />
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-headline italic text-primary mb-1">Q2 2026</div>
                <div className="text-sm text-muted-foreground">Launch timeline</div>
              </div>
              <div className="w-px bg-border hidden sm:block" />
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-headline italic text-primary mb-1">100%</div>
                <div className="text-sm text-muted-foreground">Private forever</div>
              </div>
            </motion.div>

            {/* Social proof line */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-sm text-muted-foreground pt-4"
            >
              Trusted by privacy advocates, backed by <span className="text-primary font-semibold">Aleo blockchain</span>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
