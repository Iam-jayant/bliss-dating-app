import { AgeVerification } from '@/components/landing/age-verification';

export default function AppPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <h1 className="text-4xl font-bold mb-8">Bliss App</h1>
            </div>

            <div className="w-full max-w-md">
                <AgeVerification />
            </div>

            <div className="mt-12 text-center">
                <p className="text-muted-foreground">
                    Welcome to the private space. Reveal less, discover more.
                </p>
            </div>
        </div>
    );
}
