"use client";

import { useEffect, useState } from 'react';

const confettiColors = [
  '#E3EBD0', // Pale Matcha
  '#E6E6FA', // Muted Lavender
  '#C5C6E0',
  '#B8D6B8'
];

const ConfettiParticle = ({ id }: { id: number }) => {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const randomColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    const randomX = Math.random() * 100;
    const randomY = -10 - Math.random() * 20;
    const randomRotate = Math.random() * 360;
    const randomScale = 0.5 + Math.random();
    const randomDuration = 3 + Math.random() * 2;
    const randomDelay = Math.random() * 1.5;

    setStyle({
      '--color': randomColor,
      '--x-start': `${randomX}vw`,
      '--y-start': `${randomY}vh`,
      '--rotate-start': `${randomRotate}deg`,
      '--scale': randomScale,
      '--x-end': `${randomX + (Math.random() - 0.5) * 50}vw`,
      '--y-end': '110vh',
      '--rotate-end': `${randomRotate + (Math.random() - 0.5) * 720}deg`,
      animation: `fall ${randomDuration}s ${randomDelay}s cubic-bezier(0.1, 0.5, 0.7, 1) forwards`,
    } as React.CSSProperties & Record<string, any>);
  }, [id]);

  return (
    <div
      className="pointer-events-none absolute h-2.5 w-1.5 rounded-full"
      style={{
        ...style,
        backgroundColor: 'var(--color)',
        top: 'var(--y-start)',
        left: 'var(--x-start)',
        transform: `rotate(var(--rotate-start)) scale(var(--scale))`,
      }}
    >
      <style>{`
        @keyframes fall {
          to {
            transform: translate(calc(var(--x-end) - var(--x-start)), calc(var(--y-end) - var(--y-start))) rotate(var(--rotate-end)) scale(var(--scale));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export const Confetti = () => {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 150 }, (_, i) => i);
    setParticles(newParticles);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {particles.map((id) => (
        <ConfettiParticle key={id} id={id} />
      ))}
    </div>
  );
};
