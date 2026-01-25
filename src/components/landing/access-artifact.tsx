"use client";
import React, { useRef, useEffect } from 'react';
import { Fingerprint } from 'lucide-react';

export function AccessArtifact() {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!cardRef.current) return;
            const { left, top, width, height } = cardRef.current.getBoundingClientRect();
            const x = e.clientX - left - width / 2;
            const y = e.clientY - top - height / 2;

            const rotateX = (-y / height) * 15;
            const rotateY = (x / width) * 15;

            cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1, 1, 1)`;
        };

        const handleMouseLeave = () => {
            if (cardRef.current) {
                cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            }
        };

        const container = document.querySelector('#access-artifact-section');
        container?.addEventListener('mousemove', handleMouseMove as EventListener);
        container?.addEventListener('mouseleave', handleMouseLeave);
        
        return () => {
            container?.removeEventListener('mousemove', handleMouseMove as EventListener);
            container?.removeEventListener('mouseleave', handleMouseLeave);
        };

    }, []);

    return (
        <section id="access-artifact-section" className="relative py-20 md:py-40 overflow-hidden">
             <div className="container mx-auto flex flex-col items-center justify-center px-4">
                <div className="text-center">
                    <h2 className="font-headline text-4xl italic md:text-5xl">Your Keys, Your Badge.</h2>
                    <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
                        This is your Access Artifact. An on-chain, private record that only you can control.
                    </p>
                </div>

                <div className="mt-16 [perspective:1000px] sm:mt-24">
                    <div 
                        ref={cardRef}
                        className="group relative h-80 w-56 rounded-3xl border border-white/10 bg-black/50 p-6 shadow-2xl transition-transform duration-300 ease-out"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        <div className="absolute inset-0 rounded-3xl holographic-bg opacity-30" />
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-background/30 via-transparent to-primary/30" />

                        <div 
                            className="absolute inset-0 z-10 h-full w-full rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 glint-effect"
                        />
                        
                        <div className="relative z-20 flex h-full flex-col justify-between" style={{ transform: 'translateZ(20px)' }}>
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs text-white/50">Aleo Record</span>
                                <Fingerprint className="h-5 w-5 text-white/50" />
                            </div>
                            <div className="text-center">
                                <p className="font-mono text-lg text-green-400">is_adult: true</p>
                            </div>
                            <div>
                                <p className="font-mono text-xs text-white/50">Owner: you.private</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
