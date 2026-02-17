'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "Finally, a dating app that doesn't feel like it's using me. The privacy features are incredible.",
    author: "Alex, 28",
    location: "San Francisco",
    rating: 5
  },
  {
    quote: "I love that I can verify I'm real without uploading my ID. The whole experience feels more respectful.",
    author: "Sarah, 26",
    location: "New York",
    rating: 5
  },
  {
    quote: "No more toxic swiping addiction. Bliss makes dating feel intentional again.",
    author: "Jordan, 30",
    location: "Austin",
    rating: 5
  },
  {
    quote: "The fact that my messages are actually private? Game changer. Other apps should be ashamed.",
    author: "Morgan, 27",
    location: "Portland",
    rating: 5
  }
];

export function SocialProofSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-secondary/20 to-background">
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
            People are <span className="text-primary">actually dating</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Real stories from real people who chose privacy
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="relative h-full rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-shadow duration-300">
                {/* Quote icon */}
                <div className="absolute top-6 right-6 opacity-10">
                  <Quote className="w-12 h-12 text-primary" fill="currentColor" />
                </div>

                <div className="relative">
                  {/* Rating stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star 
                        key={i} 
                        className="w-4 h-4 text-primary fill-primary" 
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-lg text-foreground mb-6 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {testimonial.author.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 flex flex-wrap justify-center items-center gap-8"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="w-4 h-4 text-primary fill-primary" />
            </div>
            <span className="text-sm font-semibold">4.9/5 Average Rating</span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-sm font-semibold text-muted-foreground">
            🔒 SOC 2 Type II Compliant
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-sm font-semibold text-muted-foreground">
            ✅ Open Source Security
          </div>
        </motion.div>
      </div>
    </section>
  );
}
