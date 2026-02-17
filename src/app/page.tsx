import { BackgroundBlob } from '@/components/landing/background-blob';
import { FlashlightEffect } from '@/components/landing/flashlight-effect';
import { Footer } from '@/components/landing/footer';
import { HeroDating } from '@/components/landing/hero-dating';
import { ComparisonSection } from '@/components/landing/comparison-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { PrivacyHighlights } from '@/components/landing/privacy-highlights';
import { SocialProofSection } from '@/components/landing/social-proof-section';
import { HowItWorks } from '@/components/landing/how-it-works';
import { PricingSection } from '@/components/landing/pricing-section';
import { FinalCTASection } from '@/components/landing/final-cta-section';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <BackgroundBlob />

      <FlashlightEffect>
        <main className="relative z-10 isolate space-y-16 md:space-y-24">
          {/* New Hero with App Mockup */}
          <HeroDating />

          {/* Comparison: Bliss vs Traditional */}
          <ComparisonSection />

          {/* Features Section */}
          <FeaturesSection />

          {/* Privacy Highlights (existing) */}
          <div className="container mx-auto px-6 md:px-10 lg:px-16">
            <PrivacyHighlights />
          </div>

          {/* Social Proof / Testimonials */}
          <SocialProofSection />

          {/* How It Works (existing) */}
          <HowItWorks />

          {/* Pricing Section */}
          <PricingSection />

          {/* Final CTA */}
          <FinalCTASection />
        </main>
        <Footer />
      </FlashlightEffect>
    </div>
  );
}
