"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';

export function ConnectionVisual() {
  return (
    <motion.div
      className="my-16 md:my-24"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container mx-auto px-4">
        <div className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl shadow-black/10 md:aspect-[3/1]">
          <Image
            src="https://picsum.photos/seed/hands-reach/1200/400"
            alt="Two hands reaching towards each other, symbolizing a gentle connection."
            fill
            className="object-cover"
            data-ai-hint="hands reaching"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-background/10 to-transparent" />
        </div>
      </div>
    </motion.div>
  );
}
