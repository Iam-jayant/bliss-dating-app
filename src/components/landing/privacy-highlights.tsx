import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Lock, EyeOff } from "lucide-react";

const highlights = [
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: "Verify Facts, Not Identity",
    description: "Prove you're over 18 or a unique person using zero-knowledge proofs. Your real-world identity is never required.",
  },
  {
    icon: <Lock className="h-8 w-8 text-primary" />,
    title: "Own Your Credentials",
    description: "Your verifications and reputation are private, on-chain assets that you control. They are not stored on our servers.",
  },
  {
    icon: <EyeOff className="h-8 w-8 text-primary" />,
    title: "Privacy by Default",
    description: "No names, no location history, no preference tracking. Connect based on what you choose to signal, not what's surveilled.",
  },
];

export function PrivacyHighlights() {
  return (
    <section id="privacy" className="py-20 md:py-32">
      <div className="text-center">
        <h2 className="font-headline text-4xl italic md:text-5xl">Our Privacy Promise</h2>
        <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
          We believe in a world where you control your data. Here’s how we make that a reality.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.title} className="bg-card/50 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2">
            <CardHeader>
              <div className="mb-4">{item.icon}</div>
              <CardTitle className="font-headline text-2xl tracking-normal">{item.title}</CardTitle>
              <CardDescription className="pt-2 text-base">
                {item.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
