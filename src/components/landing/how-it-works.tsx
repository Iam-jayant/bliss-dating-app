"use client";
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, KeyRound, Gem } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function HowItWorks() {
    const isMobile = useIsMobile();
    const targetRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ['start start', 'end end'],
    });

    const x = useTransform(scrollYProgress, [0.1, 0.9], ['0%', '-66.67%']);

    if (isMobile) {
        return (
            <section className="py-20 md:py-32">
                <div className="container mx-auto px-4">
                    <div className="text-center">
                        <h2 className="font-headline text-4xl italic md:text-5xl">From Secret to Signal.</h2>
                        <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
                            See how your private data is transformed into a verifiable credential, without revealing a thing.
                        </p>
                    </div>
                    <div className="mt-16 flex flex-col items-center gap-16">
                        <div className="flex w-full flex-col items-center text-center">
                           <div className="relative flex h-64 w-64 items-center justify-center drop-shadow-[0_0_2rem_hsl(var(--primary))]">
                                <KeyRound className="relative z-10 h-20 w-20 text-primary" />
                            </div>
                            <h3 className="mt-8 text-xl font-semibold">Your Secret</h3>
                            <p className="mt-4 text-muted-foreground">Your birth year, kept private on your device.</p>
                        </div>
                        <div className="flex w-full flex-col items-center text-center">
                             <div className="relative flex h-64 w-64 items-center justify-center drop-shadow-[0_0_2rem_hsl(var(--accent)/0.7)]">
                               <div className="absolute h-72 w-40 rounded-2xl border-2 border-white/10 bg-white/5 backdrop-blur-md" />
                               <Shield className="relative z-10 h-16 w-16 text-accent-foreground" />
                            </div>
                            <h3 className="mt-8 text-xl font-semibold">ZK-Circuit</h3>
                            <p className="mt-4 text-muted-foreground">A "glass wall" that proves your age without seeing it.</p>
                        </div>
                        <div className="flex w-full flex-col items-center text-center">
                            <div className="relative flex h-64 w-64 items-center justify-center drop-shadow-[0_0_2.5rem_#FACC15]">
                                <Gem className="h-20 w-20 text-yellow-400" />
                            </div>
                            <h3 className="mt-8 text-xl font-semibold">Aleo Record</h3>
                            <p className="mt-4 text-muted-foreground">A private, on-chain record you own.</p>
                        </div>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section ref={targetRef} className="relative h-[300vh] py-20 md:py-32">
            <div className="sticky top-0 flex h-screen flex-col items-center justify-start overflow-hidden pt-16 md:pt-24">
                {/* Title Area */}
                <div className="container mx-auto px-4 text-center">
                    <h2 className="font-headline text-4xl italic md:text-5xl">From Secret to Signal.</h2>
                    <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
                        See how your private data is transformed into a verifiable credential, without revealing a thing.
                    </p>
                </div>

                {/* Animation Area */}
                <div className="relative flex w-full flex-grow items-center">
                    <motion.div style={{ x }} className="absolute flex w-[300%] items-start pt-16">
                        <div className="grid w-full grid-cols-3">
                            
                            {/* Panel 1: Your Secret */}
                            <div className="flex w-full flex-col items-center justify-start text-center px-8">
                                <div className="relative flex h-64 w-64 items-center justify-center drop-shadow-[0_0_2.5rem_hsl(var(--primary))]">
                                    <KeyRound className="relative z-10 h-24 w-24 text-primary" />
                                </div>
                                <h3 className="mt-8 text-xl font-semibold">Your Secret</h3>
                                <p className="mt-4 text-muted-foreground">Your birth year, kept private on your device.</p>
                            </div>

                            {/* Panel 2: ZK-Circuit */}
                            <div className="flex w-full flex-col items-center justify-start text-center px-8">
                                <div className="relative flex h-72 w-44 items-center justify-center rounded-3xl border-2 border-white/10 bg-white/5 backdrop-blur-sm drop-shadow-[0_0_2rem_hsl(var(--accent)/0.7)]">
                                    <Shield className="h-20 w-20 text-accent-foreground/80" />
                                </div>
                                <h3 className="mt-8 text-xl font-semibold">ZK-Circuit</h3>
                                <p className="mt-4 text-muted-foreground">A "glass wall" that proves your age without seeing it.</p>
                            </div>
                            
                            {/* Panel 3: Aleo Record */}
                            <div className="flex w-full flex-col items-center justify-start text-center px-8">
                                <div className="relative flex h-64 w-64 items-center justify-center drop-shadow-[0_0_2.5rem_#FACC15]">
                                    <Gem className="h-28 w-28 text-yellow-400" />
                                </div>
                                <h3 className="mt-8 text-xl font-semibold">Aleo Record</h3>
                                <p className="mt-4 text-muted-foreground">A private, on-chain record you own.</p>
                            </div>

                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
