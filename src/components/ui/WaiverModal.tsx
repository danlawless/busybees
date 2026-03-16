'use client';

/**
 * Waiver Modal
 * Displays the full waiver text for parents/staff to review
 */

import { FileText, X, AlertTriangle, Shield, Camera, Baby, Printer } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface WaiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName?: string;
  signedDate?: string | null;
  onAgree?: () => void;
  isSubmitting?: boolean;
}

const waiverSections = [
  {
    icon: Shield,
    title: 'Assumption of Risk',
    content: `I, the parent or legal guardian of the child(ren) named above, acknowledge that the use of indoor play equipment involves inherent risks, including but not limited to bumps, bruises, scrapes, and other injuries. I understand that while Busy Bees Indoor Play Center takes reasonable precautions to ensure safety, accidents may occur during normal play activities.`
  },
  {
    icon: AlertTriangle,
    title: 'Release of Liability',
    content: `I hereby release, waive, and discharge Busy Bees Indoor Play Center, its owners, operators, employees, and agents from any and all liability, claims, demands, or causes of action that may arise from my child's participation in play activities at this facility. This release includes, but is not limited to, any injuries, damages, or losses sustained by my child while using the play equipment or facilities.`
  },
  {
    icon: Baby,
    title: 'Supervision Responsibility',
    content: `I understand and agree that I am solely responsible for supervising my child(ren) at all times while at Busy Bees Indoor Play Center. I acknowledge that staff members are not babysitters and that the primary responsibility for my child's safety rests with me as the parent or guardian.`
  },
  {
    icon: Camera,
    title: 'Photo/Video Release',
    content: `I grant Busy Bees Indoor Play Center permission to photograph and/or video record my child(ren) for promotional, marketing, and social media purposes. I understand that I may opt out of this permission by notifying staff at any time.`
  },
];

const waiverAgreements = [
  'My child is in good health and has no medical conditions that would prevent safe participation in play activities',
  'I will ensure my child follows all posted rules and staff instructions',
  'I understand that failure to follow rules may result in removal from the premises without refund',
  'I agree to be financially responsible for any damage caused by my child to the facility or equipment',
  'I have read, understand, and agree to all terms outlined in this waiver',
];

export function WaiverModal({ isOpen, onClose, childName, signedDate, onAgree, isSubmitting }: WaiverModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const formattedSignedDate = signedDate
    ? new Date(signedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Waiver - ${childName || 'Guest'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; color: #1f2937; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h3 { font-size: 15px; margin: 0 0 8px; }
          p, li { font-size: 13px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 16px; margin-bottom: 24px; }
          .header p { color: #6b7280; margin: 4px 0; }
          .section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
          .section-title { font-weight: 600; margin-bottom: 8px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 6px; }
          .legal { background: #f9fafb; padding: 12px; border-radius: 8px; font-size: 11px; color: #6b7280; }
          .signature { margin-top: 32px; border-top: 2px solid #e5e7eb; padding-top: 20px; }
          .signature-line { border-bottom: 1px solid #1f2937; width: 300px; display: inline-block; margin-top: 40px; }
          .signed-badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Busy Bees Indoor Play Center</h1>
          <p><strong>Liability Waiver & Release Form</strong></p>
          ${childName ? `<p>Child: <strong>${childName}</strong></p>` : ''}
          ${formattedSignedDate ? `<p><span class="signed-badge">Signed: ${formattedSignedDate}</span></p>` : ''}
        </div>
        ${content.innerHTML}
        <div class="signature">
          <p><strong>Parent/Guardian Signature:</strong></p>
          ${formattedSignedDate
            ? `<p>Electronically signed on <strong>${formattedSignedDate}</strong></p>`
            : `<p class="signature-line"></p><br/><p>Date: _______________</p>`
          }
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-honey-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-honey-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Liability Waiver</h2>
              {childName && (
                <p className="text-sm text-gray-600">For: {childName}</p>
              )}
              {formattedSignedDate && (
                <p className="text-xs text-green-700">Signed: {formattedSignedDate}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={printRef}>
          {/* Introduction */}
          <div className="bg-honey-50 border border-honey-200 rounded-lg p-4">
            <p className="text-sm text-charcoal-700">
              <strong>Busy Bees Indoor Play Center</strong> requires all parents/guardians to read and
              acknowledge the following waiver before their child(ren) may participate in play activities.
              By signing this waiver, you agree to the terms and conditions outlined below.
            </p>
          </div>

          {/* Waiver Sections */}
          {waiverSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{section.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
              </div>
            );
          })}

          {/* Acknowledgments */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">By signing this waiver, I acknowledge that:</h3>
            <ul className="space-y-2">
              {waiverAgreements.map((agreement, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <span className="text-honey-500 mt-0.5">•</span>
                  <span>{agreement}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong>Legal Notice:</strong> This waiver is binding upon the undersigned, their heirs,
              executors, administrators, and assigns. If any portion of this waiver is held invalid,
              the remaining portions shall continue to be valid and enforceable. This waiver is governed
              by the laws of the State of Massachusetts.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          {onAgree ? (
            <div className="flex space-x-3">
              <Button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={onAgree}
                disabled={isSubmitting}
                className="flex-1 bg-honey-500 text-white hover:bg-honey-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Signing...' : 'I Agree - Sign Waiver'}
              </Button>
            </div>
          ) : (
            <div className="flex space-x-3">
              <Button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300">
                Close
              </Button>
              <Button
                onClick={handlePrint}
                className="flex-1 bg-charcoal-800 text-white hover:bg-charcoal-700 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Waiver
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
