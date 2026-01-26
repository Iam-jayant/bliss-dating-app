"use client";

import { useState, useEffect } from 'react';

export function HoverHint() {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Show hint after a brief delay
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    // Start fade out after 9 seconds
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 10500);

    // Remove from DOM after fade out completes
    const removeTimer = setTimeout(() => {
      setShouldRender(false);
    }, 12000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <p className="text-white/60 text-xs font-light">
        <span className="hidden sm:inline">hover to explore</span>
        <span className="sm:hidden">tap to explore</span>
      </p>
    </div>
  );
}