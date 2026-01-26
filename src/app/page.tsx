import { AccessArtifact } from '@/components/landing/access-artifact';
import { AgeVerification } from '@/components/landing/age-verification';
import { HeroTryBlissButton } from '@/components/landing/hero-try-bliss-button';
import { HoverHint } from '@/components/landing/hover-hint';
import { BackgroundBlob } from '@/components/landing/background-blob';
import { FlashlightEffect } from '@/components/landing/flashlight-effect';
import { Footer } from '@/components/landing/footer';
import { HowItWorks } from '@/components/landing/how-it-works';
import { PrivacyHighlights } from '@/components/landing/privacy-highlights';
import { RealityCheck } from '@/components/landing/reality-check';
import { TheProblem } from '@/components/landing/the-problem';
import { WhyAleo } from '@/components/landing/why-aleo';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <BackgroundBlob />

      <FlashlightEffect>
        <HoverHint />
        <main className="relative z-10 isolate">
          <div className="container mx-auto px-4">
            <section
              className="relative flex min-h-[100svh] flex-col items-center justify-center text-center py-8 px-4"
              id="hero"
            >
              {/* Top-right Try Bliss Button */}
              <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20">
                <HeroTryBlissButton />
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-6 md:space-y-8 max-w-4xl mx-auto w-full">
                <div className="space-y-4 md:space-y-6">
                  <h1 className="font-headline text-4xl md:text-5xl lg:text-7xl xl:text-8xl italic leading-tight">
                    Privacy is the new luxury
                  </h1>
                  <p className="font-body max-w-2xl mx-auto text-base md:text-lg lg:text-xl text-foreground/80 px-4">
                    A private space to connect based on verified truths, not public data. Reveal less, discover more.
                  </p>
                </div>

                {/* ZK Proof Demo Component */}
                <div className="w-full max-w-sm md:max-w-md mx-auto px-4">
                  <AgeVerification />
                </div>
                
                {/* Bottom section with branding only */}
                <div className="pt-6 md:pt-8">
                  <div className="text-center">
                    <p className="font-headline text-lg md:text-xl italic text-primary [text-shadow:0_0_12px_hsl(var(--primary)/0.6)]">
                      Bliss - find your vibe
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      a privacy focused dating app
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <TheProblem />
            <PrivacyHighlights />
          </div>

          <HowItWorks />
          <RealityCheck />
          <WhyAleo />
          <AccessArtifact />
        </main>
        <Footer />
      </FlashlightEffect>
    </div>
  );
}
