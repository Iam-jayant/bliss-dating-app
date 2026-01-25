"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import React, { useEffect, useState } from 'react';

export function FlashlightEffect({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(1);

  useEffect(() => {
    // Component has mounted, so we can start the transition.
    setIsMounted(true);

    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    
    const handleScroll = () => {
        // Fade out over the first 80% of viewport height
        const fadeEndPosition = window.innerHeight * 0.8;
        const currentScroll = window.scrollY;
        const newOpacity = Math.max(0, 1 - (currentScroll / fadeEndPosition));
        setScrollOpacity(newOpacity);
    };

    // Set initial position to the center of the screen
    document.documentElement.style.setProperty('--mouse-x', `${window.innerWidth / 2}px`);
    document.documentElement.style.setProperty('--mouse-y', `${window.innerHeight / 2}px`);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Run on mount
    handleScroll();
    
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile]);

  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 ease-out"
        style={{
          backdropFilter: 'blur(4px)',
          opacity: isMounted ? scrollOpacity : 0,
          WebkitMaskImage: `radial-gradient(250px circle at var(--mouse-x, 50vw) var(--mouse-y, 50vh), transparent 20%, black 100%)`,
          maskImage: `radial-gradient(250px circle at var(--mouse-x, 50vw) var(--mouse-y, 50vh), transparent 20%, black 100%)`,
        }}
      />
    </div>
  );
}
