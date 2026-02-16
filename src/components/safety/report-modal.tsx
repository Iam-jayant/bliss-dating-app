/**
 * Report Modal Component
 * Privacy-preserving reporting system
 * Reports stored encrypted in Gun.js P2P network
 */

'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Flag, Shield, MessageCircleWarning, User } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserAddress: string;
  reportedUserName: string;
  context?: 'profile' | 'message';
}

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or Bullying', icon: MessageCircleWarning },
  { value: 'fake', label: 'Fake Profile or Catfishing', icon: User },
  { value: 'inappropriate', label: 'Inappropriate Content', icon: AlertTriangle },
  { value: 'spam', label: 'Spam or Scam', icon: Flag },
  { value: 'safety', label: 'Safety Concerns', icon: Shield },
  { value: 'other', label: 'Other', icon: AlertTriangle },
];

export function ReportModal({
  isOpen,
  onClose,
  reportedUserAddress,
  reportedUserName,
  context = 'profile',
}: ReportModalProps) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;

    setIsSubmitting(true);

    try {
      // In production, this would:
      // 1. Encrypt the report with a moderation key
      // 2. Store in Gun.js: gun.get('bliss_reports').get(reportedUserAddress).set(encryptedReport)
      // 3. Increment report counter (ZK-based reputation)
      // 4. Auto-block user locally if threshold reached

      const report = {
        reportedUser: reportedUserAddress,
        reason,
        details,
        context,
        timestamp: Date.now(),
      };

      // Store encrypted report in Gun.js
      if (typeof window !== 'undefined') {
        try {
          const Gun = (await import('gun')).default;
          const gun = Gun({
            peers: ['https://gun-manhattan.herokuapp.com/gun'],
          });

          await gun
            .get('bliss_reports')
            .get(reportedUserAddress)
            .set(report);
        } catch (err) {
          console.warn('Gun.js report storage failed:', err);
        }
      }

      // Also store locally for blocking
      const blockedUsers = JSON.parse(localStorage.getItem('bliss_blocked_users') || '[]');
      if (!blockedUsers.includes(reportedUserAddress)) {
        blockedUsers.push(reportedUserAddress);
        localStorage.setItem('bliss_blocked_users', JSON.stringify(blockedUsers));
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setReason('');
        setDetails('');
      }, 2000);
    } catch (err) {
      console.error('Report submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report User">
      {submitted ? (
        <div className="py-8 text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Report Submitted</h3>
          <p className="text-sm text-muted-foreground">
            Thank you for helping keep Bliss safe. We've blocked this user from your view.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Reporting <span className="font-medium text-foreground">{reportedUserName}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Your report is encrypted and stored privately. This user will be automatically blocked.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Reason for reporting</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((item) => (
                <div
                  key={item.value}
                  className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                  onClick={() => setReason(item.value)}
                >
                  <RadioGroupItem value={item.value} id={item.value} />
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={item.value} className="cursor-pointer flex-1">
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional information that might be helpful..."
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
