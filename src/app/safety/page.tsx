/**
 * Safety Center Page
 * Education on dating safely and reporting
 */

'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Heart, Lock, Eye, Flag, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function SafetyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Shield className="h-16 w-16 text-primary mx-auto" />
        <h1 className="text-4xl font-bold">Safety Center</h1>
        <p className="text-lg text-muted-foreground">
          Your safety is our priority. Learn how to date safely and protect yourself.
        </p>
      </div>

      {/* Bliss Privacy Features */}
      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Lock className="h-6 w-6 text-primary" />
          How Bliss Protects You
        </h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
            <div>
              <h3 className="font-medium">Private by Design</h3>
              <p className="text-sm text-muted-foreground">
                Your data is encrypted and never shared with advertisers or third parties.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
            <div>
              <h3 className="font-medium">End-to-End Encrypted Messages</h3>
              <p className="text-sm text-muted-foreground">
                Only you and your match can read your conversations. Not even Bliss has access.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
            <div>
              <h3 className="font-medium">Approximate Location Only</h3>
              <p className="text-sm text-muted-foreground">
                Your exact location is never revealed - we only show approximate distance (~5km zones).
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
            <div>
              <h3 className="font-medium">Age Verified</h3>
              <p className="text-sm text-muted-foreground">
                All users are verified to be 18+, but your exact age is kept private.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Meeting Safely */}
      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          Meeting Someone from Bliss
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Before You Meet</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span>✓</span>
                <span>Get to know them through messages first</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Video chat before meeting in person</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Tell a friend where you're going and when</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Trust your instincts - if something feels off, it probably is</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">First Date Safety</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span>✓</span>
                <span>Meet in a public place during daytime</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Arrange your own transportation</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Keep your phone charged and with you</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Don't share too much personal information early on</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Don't feel pressured to drink alcohol</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Recognizing Red Flags */}
      <Card className="p-6 space-y-4 border-orange-200">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-600" />
          Recognizing Scams & Red Flags
        </h2>
        <div className="space-y-3">
          <div className="bg-orange-50 p-3 rounded-lg">
            <h3 className="font-medium text-orange-900 mb-2">⚠️ Watch out for:</h3>
            <ul className="space-y-2 text-sm text-orange-800">
              <li>• Asking for money or financial information</li>
              <li>• Pushing to move conversations off the app immediately</li>
              <li>• Profile photos that look too perfect (stolen/stock photos)</li>
              <li>• Avoiding video calls or meeting in person</li>
              <li>• Inconsistent stories or vague answers</li>
              <li>• Rushing into declarations of love</li>
              <li>• Asking for explicit photos or being overly sexual too soon</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Reporting & Blocking */}
      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Flag className="h-6 w-6 text-primary" />
          Reporting & Blocking
        </h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            If someone makes you uncomfortable or violates our community guidelines, take action:
          </p>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium mb-2">How to Block Someone</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Blocking prevents them from seeing your profile or contacting you.
              </p>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                <li>Go to their profile or your conversation</li>
                <li>Tap the menu icon (three dots)</li>
                <li>Select "Block"</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium mb-2">How to Report Someone</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Reporting helps keep the community safe. Reports are encrypted and reviewed privately.
              </p>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                <li>Go to their profile or conversation</li>
                <li>Tap the menu icon (three dots)</li>
                <li>Select "Report"</li>
                <li>Choose the reason and provide details</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                All reports are kept confidential and the user won't know you reported them.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Resources */}
      <Card className="p-6 space-y-4 bg-primary/5">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          Additional Resources
        </h2>
        <div className="space-y-2">
          <Link href="https://www.rainn.org" target="_blank" className="block text-sm text-primary hover:underline">
            RAINN National Sexual Assault Hotline: 1-800-656-4673
          </Link>
          <Link href="https://www.thehotline.org" target="_blank" className="block text-sm text-primary hover:underline">
            National Domestic Violence Hotline: 1-800-799-7233
          </Link>
          <Link href="https://suicidepreventionlifeline.org" target="_blank" className="block text-sm text-primary hover:underline">
            National Suicide Prevention Lifeline: 988
          </Link>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center pt-4">
        <Button variant="outline" asChild>
          <Link href="/settings">Privacy Settings</Link>
        </Button>
        <Button asChild>
          <Link href="/discovery">Back to Bliss</Link>
        </Button>
      </div>
    </div>
  );
}
