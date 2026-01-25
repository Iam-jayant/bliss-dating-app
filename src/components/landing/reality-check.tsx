"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Shield, Lock, Sparkles, HeartCrack, Eye, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Confetti } from './confetti';

const casinoData = {
  title: "The Casino",
  features: [
    { icon: <Eye className="h-6 w-6 text-red-400/70" />, text: "Your data is the product", name: "Business Model" },
    { icon: <HeartCrack className="h-6 w-6 text-red-400/70" />, text: "Endless, addictive swiping", name: "User Experience" },
    { icon: <DollarSign className="h-6 w-6 text-red-400/70" />, text: "Public profiles, fake verification", name: "Privacy" },
  ]
};

const blissData = {
  title: "The Sanctuary",
  features: [
    { icon: <Shield className="h-6 w-6 text-emerald-400" />, text: "Privacy is the product", name: "Business Model" },
    { icon: <Sparkles className="h-6 w-6 text-emerald-400" />, text: "Calm, intentional discovery", name: "User Experience" },
    { icon: <Lock className="h-6 w-6 text-emerald-400" />, text: "Verified facts, private identity", name: "Privacy" },
  ]
};

const CasinoSide = ({ isHovered }: { isHovered: boolean }) => (
  <div className="relative h-full w-full overflow-hidden p-8 md:p-12">
    <div className={cn("absolute inset-0 bg-[#1a1a1a] transition-opacity")}></div>
    <div className="relative z-10">
      <h3 className={cn("font-headline text-3xl italic text-red-400/80 transition-all")}>
        {casinoData.title}
      </h3>
      <ul className="mt-8 space-y-6">
        {casinoData.features.map(feature => (
          <li key={feature.name} className="flex items-start gap-4">
            {feature.icon}
            <div>
              <p className="font-semibold text-white/80">{feature.name}</p>
              <p className="text-red-300/60">{feature.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const BlissSide = ({ isHovered }: { isHovered: boolean }) => (
    <div className="relative h-full w-full overflow-hidden p-8 md:p-12">
    {isHovered && <Confetti />}
    <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-accent/20"></div>
     {isHovered && <div className="absolute inset-0 bg-primary/20 animate-pulse-fast transition-opacity duration-1000" style={{ animationDuration: '1s' }} />}
    <div className="relative z-10">
      <h3 className="font-headline text-3xl italic text-emerald-500">
        {blissData.title}
      </h3>
      <ul className="mt-8 space-y-6">
        {blissData.features.map(feature => (
          <li key={feature.name} className="flex items-start gap-4">
            {feature.icon}
            <div>
              <p className="font-semibold text-foreground">{feature.name}</p>
              <p className="text-muted-foreground">{feature.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export function RealityCheck() {
  const isMobile = useIsMobile();
  const [hoveredSide, setHoveredSide] = useState<'bliss' | 'casino' | null>(null);
  const [showBlissMobile, setShowBlissMobile] = useState(true);

  if (isMobile) {
    const data = showBlissMobile ? blissData : casinoData;
    return (
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
            <div className="text-center mb-12">
                 <h2 className="font-headline text-4xl italic md:text-5xl">The Reality Check</h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                    How Bliss redefines the rules of connection.
                </p>
            </div>
            <div className="flex items-center justify-center space-x-3 mb-8">
                <span className={cn("text-muted-foreground transition-colors", !showBlissMobile && "text-red-400/80 font-semibold")}>The Casino</span>
                <Switch checked={showBlissMobile} onCheckedChange={setShowBlissMobile} id="reality-toggle" />
                <span className={cn("text-muted-foreground transition-colors", showBlissMobile && "text-emerald-500 font-semibold")}>The Sanctuary</span>
            </div>
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={showBlissMobile ? 'bliss' : 'casino'}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                        "rounded-2xl border overflow-hidden",
                        showBlissMobile ? "border-primary/20 bg-primary/5" : "border-white/10 bg-[#1a1a1a]"
                    )}
                >
                  {showBlissMobile ? <BlissSide isHovered={false} /> : <CasinoSide isHovered={false} />}
                </motion.div>
            </AnimatePresence>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
            <div className="text-center mb-16">
                 <h2 className="font-headline text-4xl italic md:text-5xl">The Reality Check</h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                    How Bliss redefines the rules of connection.
                </p>
            </div>
            <div className="relative flex min-h-[500px] w-full max-w-5xl mx-auto rounded-2xl border border-border overflow-hidden">
                <motion.div
                    className="relative cursor-pointer overflow-hidden"
                    onHoverStart={() => setHoveredSide('casino')}
                    onHoverEnd={() => setHoveredSide(null)}
                    animate={{ width: hoveredSide === 'bliss' ? '30%' : hoveredSide === 'casino' ? '70%' : '50%'}}
                    transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                >
                    <CasinoSide isHovered={hoveredSide === 'casino'}/>
                </motion.div>

                <div className="w-1.5 shrink-0 bg-white/10 backdrop-blur-sm z-10" />

                <motion.div
                    className="relative cursor-pointer overflow-hidden"
                    onHoverStart={() => setHoveredSide('bliss')}
                    onHoverEnd={() => setHoveredSide(null)}
                    animate={{ width: hoveredSide === 'casino' ? '30%' : hoveredSide === 'bliss' ? '70%' : '50%'}}
                    transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                >
                    <BlissSide isHovered={hoveredSide === 'bliss'} />
                </motion.div>
            </div>
        </div>
        <style>{`
            @keyframes pulse-fast {
              0%, 100% { opacity: 0; }
              50% { opacity: 0.2; }
            }
            .animate-pulse-fast { animation: pulse-fast 1s ease-in-out infinite; }
        `}</style>
    </section>
  )
}
