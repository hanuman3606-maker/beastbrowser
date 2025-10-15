/**
 * Fingerprint Ethics Warning Modal
 * 
 * Displays legal and ethical warnings before enabling advanced fingerprinting
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Scale, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FingerprintEthicsWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const FingerprintEthicsWarning: React.FC<FingerprintEthicsWarningProps> = ({
  open,
  onOpenChange,
  onAccept,
}) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedEthics, setAcceptedEthics] = useState(false);

  const handleAccept = () => {
    if (acceptedTerms && acceptedLegal && acceptedEthics) {
      onAccept();
      onOpenChange(false);
      
      // Reset for next time
      setAcceptedTerms(false);
      setAcceptedLegal(false);
      setAcceptedEthics(false);
    }
  };

  const canProceed = acceptedTerms && acceptedLegal && acceptedEthics;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            Advanced Fingerprinting - Legal & Ethical Notice
          </DialogTitle>
          <DialogDescription>
            Please read and acknowledge the following before enabling advanced anti-detection features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Advanced fingerprint spoofing and anti-detection technologies must be used responsibly and legally.
            </AlertDescription>
          </Alert>

          <Separator />

          {/* Legal Notice */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-lg">Legal Compliance</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>You must comply with all applicable laws and regulations.</strong> This includes, but is not limited to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Computer Fraud and Abuse Act (CFAA) and equivalent laws in your jurisdiction</li>
                <li>Terms of Service of websites you visit</li>
                <li>Data protection and privacy regulations (GDPR, CCPA, etc.)</li>
                <li>Anti-bot and anti-scraping policies</li>
                <li>Intellectual property laws</li>
              </ul>
              <p className="mt-2">
                <strong>Prohibited uses include:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Unauthorized access to computer systems or networks</li>
                <li>Bypassing security measures to commit fraud</li>
                <li>Creating fake accounts for malicious purposes</li>
                <li>Scraping or harvesting data without permission</li>
                <li>Evading rate limits or access controls to cause harm</li>
                <li>Any activity that violates laws or regulations</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Ethical Guidelines */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold text-lg">Ethical Guidelines</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Legitimate use cases include:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Privacy protection and personal anonymity</li>
                <li>Security research and testing (with authorization)</li>
                <li>Web scraping for permitted purposes (public data, with respect to robots.txt)</li>
                <li>Automated testing of your own applications</li>
                <li>Bypassing geographic restrictions for legitimate content access</li>
                <li>Research and educational purposes</li>
              </ul>
              <p className="mt-2">
                <strong>You agree to:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Use these tools responsibly and ethically</li>
                <li>Respect website owners' rights and policies</li>
                <li>Not cause harm to others or their systems</li>
                <li>Take responsibility for your actions</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Disclaimer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-lg">Disclaimer</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                BeastBrowser provides these tools "as is" without warranty. We are not responsible for:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Any misuse of these features</li>
                <li>Legal consequences resulting from your actions</li>
                <li>Damages caused by using these tools</li>
                <li>Violations of third-party terms or policies</li>
              </ul>
              <p className="mt-2">
                <strong>By enabling these features, you acknowledge that you are solely responsible for your use of this software.</strong>
              </p>
            </div>
          </div>

          <Separator />

          {/* Checkboxes */}
          <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                I have read and understand the legal requirements and will comply with all applicable laws and regulations
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="legal"
                checked={acceptedLegal}
                onCheckedChange={(checked) => setAcceptedLegal(checked as boolean)}
              />
              <Label htmlFor="legal" className="text-sm leading-tight cursor-pointer">
                I will not use these features for illegal activities, fraud, unauthorized access, or to cause harm to others
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="ethics"
                checked={acceptedEthics}
                onCheckedChange={(checked) => setAcceptedEthics(checked as boolean)}
              />
              <Label htmlFor="ethics" className="text-sm leading-tight cursor-pointer">
                I accept full responsibility for my actions and acknowledge that BeastBrowser is not liable for my use of these tools
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!canProceed}
          >
            Accept & Enable Features
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FingerprintEthicsWarning;
