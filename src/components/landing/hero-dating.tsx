'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppMockup } from './app-mockup';
import Link from 'next/link';

export function HeroDating() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-12">
      {/* Background gradient with blur decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 -z-10" />
      <div className="absolute inset-0 opacity-20 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>
      
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid lg:grid-cols-10 gap-12 lg:gap-16 items-center">
          
          {/* Left: Emotional copy - 70% */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
          >
            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-5 py-2.5 rounded-full border border-primary/20">
                Dating Privacy. Finally.
              </span>
            </motion.div>

            {/* Headline */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-headline italic text-foreground leading-[1.1]">
                Find your{' '}
                <span className="text-primary relative inline-block">
                  person
                  <svg 
                    className="absolute -bottom-2 left-0 w-full" 
                    viewBox="0 0 200 10" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M0 5 Q50 0, 100 5 T200 5" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      fill="none"
                      className="text-primary/40"
                    />
                  </svg>
                </span>
                <br />
                keep your{' '}
                <span className="text-primary">privacy</span>
              </h1>
            </div>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Swipe. Match. Connect. <br className="hidden sm:block" />
              Without sacrificing your data or dignity.
            </p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-wrap gap-8 justify-center lg:justify-start pt-2"
            >
              <div className="text-center lg:text-left">
                <div className="text-4xl font-headline italic text-primary mb-1">100%</div>
                <div className="text-xs text-muted-foreground font-medium">Private by Default</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-border self-center" />
              <div className="text-center lg:text-left">
                <div className="text-4xl font-headline italic text-primary mb-1">$0</div>
                <div className="text-xs text-muted-foreground font-medium">To Start</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-border self-center" />
              <div className="text-center lg:text-left">
                <div className="text-4xl font-headline italic text-primary mb-1">Zero</div>
                <div className="text-xs text-muted-foreground font-medium">Dark Patterns</div>
              </div>
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-6"
            >
              <Link href="/onboarding">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base px-10 py-7 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  Start Swiping
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-base px-10 py-7 rounded-full transition-all hover:scale-105"
                onClick={() => {
                  const element = document.getElementById('how-it-works');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                How It Works
              </Button>
            </motion.div>

            {/* Trust indicator */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-sm text-muted-foreground flex items-center gap-2 justify-center lg:justify-start"
            >
              <span className="text-base">🔒</span>
              <span>Secured with zero-knowledge cryptography • No credit card required</span>
            </motion.p>
          </motion.div>

          {/* Right: App mockup - 30% */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="lg:col-span-3 flex justify-center lg:justify-end"
          >
            <AppMockup />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Scroll to explore</span>
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </motion.div>
    </section>
  );
}
