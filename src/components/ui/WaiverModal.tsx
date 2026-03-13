'use client';

/**
 * Waiver Modal
 * Displays the full waiver text for parents/staff to review
 */

import { FileText, X, AlertTriangle, Shield, Camera, Baby } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface WaiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName?: string;
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

export function WaiverModal({ isOpen, onClose, childName, onAgree, isSubmitting }: WaiverModalProps) {
  if (!isOpen) return null;

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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
