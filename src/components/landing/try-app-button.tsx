"use client";

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function TryAppButton() {
  return (
    <Button
      asChild
      size="lg"
      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border-0"
    >
      <Link href="/onboarding" className="flex items-center gap-2">
        Try Bliss
        <ArrowRight className="w-4 h-4" />
      </Link>
    </Button>
  );
}