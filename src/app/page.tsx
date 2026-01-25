import { AccessArtifact } from '@/components/landing/access-artifact';
import { AgeVerification } from '@/components/landing/age-verification';
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
        <main className="relative z-10 isolate">
          <div className="container mx-auto px-4">
            <section
              className="flex min-h-[90svh] flex-col items-center justify-center text-center"
              id="hero"
            >
              <h1 className="font-headline text-5xl italic md:text-7xl lg:text-8xl">
                Privacy is the new luxury
              </h1>
              <p className="font-body mt-6 max-w-2xl text-lg text-foreground/80 md:text-xl">
                A private space to connect based on verified truths, not public data. Reveal less, discover more.
              </p>
              <div className="mt-12 w-full max-w-md">
                <AgeVerification />
              </div>
              <div className="mt-8 text-center">
                <p className="font-headline text-xl italic text-primary [text-shadow:0_0_12px_hsl(var(--primary)/0.6)]">
                  Bliss - find your vibe
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  a privacy focused dating app
                </p>
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
