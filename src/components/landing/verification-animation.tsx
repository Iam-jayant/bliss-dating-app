"use client";

import { Shield } from 'lucide-react';
import React from 'react';

const Particle = ({ side, index }: { side: 'left' | 'right'; index: number }) => {
  const randomY = -50 + Math.random() * 100;
  const randomDuration = 1 + Math.random();
  const randomDelay = Math.random() * 0.5;

  const style: React.CSSProperties = {
    '--y-offset': `${randomY}%`,
    '--duration': `${randomDuration}s`,
    '--delay': `${randomDelay}s`,
    '--direction': side === 'left' ? '1' : '-1',
  };

  return (
    <div
      className="absolute h-1 w-1 rounded-full bg-primary/50"
      style={{
        ...style,
        top: '50%',
        left: '50%',
        animation: 'merge var(--duration) var(--delay) ease-in-out forwards',
      }}
    >
      <style>{`
        @keyframes merge {
          0% {
            transform: translate(calc(var(--direction) * (150px + ${index * 2}px)), var(--y-offset)) scale(1);
            opacity: 1;
          }
          50% {
             opacity: 1;
          }
          100% {
            transform: translate(0, 0) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export function VerificationAnimation() {
  const particleCount = 40;

  return (
    <div className="relative flex h-32 w-full items-center justify-center">
      <div className="animate-shield-pulse">
        <Shield className="h-12 w-12 text-primary/70" />
      </div>
      {Array.from({ length: particleCount }).map((_, i) => (
        <React.Fragment key={i}>
          <Particle side="left" index={i} />
          <Particle side="right" index={i} />
        </React.Fragment>
      ))}
      <style>{`
        @keyframes shield-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
        .animate-shield-pulse {
          animation: shield-pulse 2.5s infinite;
        }
      `}</style>
    </div>
  );
}
