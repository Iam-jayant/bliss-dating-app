"use client";

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function HeroTryBlissButton() {
  return (
    <Button
      asChild
      className="group bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/30 text-white font-medium px-3 py-2 md:px-4 md:py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm md:text-base"
    >
      <Link href="/onboarding" className="flex items-center gap-1.5 md:gap-2">
        Try Bliss
        <ArrowRight className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </Button>
  );
}