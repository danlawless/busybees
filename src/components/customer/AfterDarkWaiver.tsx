'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface WaiverFormData {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  authorized_pickup: string;
  allergies: string;
  medical_conditions: string;
  photo_consent: boolean;
  signature: string;
}

interface AfterDarkWaiverProps {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childNames: string;
  onComplete: (data: WaiverFormData) => void;
  onCancel: () => void;
}

export function AfterDarkWaiver({
  parentName,
  parentEmail: _parentEmail,
  parentPhone: _parentPhone,
  childNames,
  onComplete,
  onCancel,
}: AfterDarkWaiverProps) {
  const [form, setForm] = useState<WaiverFormData>({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    authorized_pickup: parentName,
    allergies: '',
    medical_conditions: '',
    photo_consent: false,
    signature: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!form.emergency_contact_name || !form.emergency_contact_phone || !form.emergency_contact_relationship || !form.authorized_pickup || !form.signature || !agreed) {
      setError('Please complete all required fields and agree to the terms.');
      return;
    }
    setError('');
    onComplete(form);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          📋
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">After Dark Drop-Off Waiver</h3>
          <p className="text-sm text-gray-500">Required before drop-off</p>
        </div>
      </div>

      {/* Waiver Text */}
      <div className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-200 max-h-64 overflow-y-auto text-sm text-gray-700 leading-relaxed space-y-3">
        <p className="font-bold text-gray-800">BUSY BEE&apos;S INDOOR PLAY CENTER — AFTER DARK DROP-OFF WAIVER &amp; LIABILITY RELEASE</p>

        <p><strong>1. Temporary Supervision Authorization</strong><br />
        I, the undersigned parent/legal guardian, hereby authorize Busy Bee&apos;s Indoor Play Center (&quot;Busy Bee&apos;s&quot;) and its staff to provide care and supervision of my child(ren) listed below during the After Dark event. I understand that my child(ren) will be under the direct supervision of Busy Bee&apos;s staff for the duration of the event and that I (the parent/guardian) will not be present on the premises.</p>

        <p><strong>2. Emergency Medical Authorization</strong><br />
        In the event of an emergency, I authorize Busy Bee&apos;s staff to seek and consent to medical treatment for my child(ren) if I or my emergency contact cannot be reached in a timely manner. I understand that Busy Bee&apos;s will make every reasonable effort to contact me or my designated emergency contact before seeking medical treatment.</p>

        <p><strong>3. Pickup Authorization</strong><br />
        I understand that my child(ren) will only be released to the authorized individuals listed on this form. Valid photo identification may be required at pickup. Busy Bee&apos;s reserves the right to verify the identity of any individual picking up a child.</p>

        <p><strong>4. Allergies &amp; Medical Conditions</strong><br />
        I have disclosed all known allergies, medical conditions, and dietary restrictions for my child(ren) below. I understand that food (pizza and drinks) will be served during the event and it is my responsibility to inform Busy Bee&apos;s of any dietary needs.</p>

        <p><strong>5. Behavioral Expectations</strong><br />
        I understand that all children must follow Busy Bee&apos;s standard play rules during the event. If my child(ren) exhibits behavior that is disruptive, unsafe, or harmful to themselves or others, Busy Bee&apos;s reserves the right to contact me for immediate pickup. No refund will be issued in such cases.</p>

        <p><strong>6. Assumption of Risk &amp; Liability Release</strong><br />
        I acknowledge that indoor play activities involve inherent risks of injury. I voluntarily assume all risks associated with my child(ren)&apos;s participation in the After Dark event. I release, waive, and discharge Busy Bee&apos;s Indoor Play Center, its owners, employees, and agents from any and all claims, damages, or liability arising from my child(ren)&apos;s participation in the event, except in cases of gross negligence or willful misconduct.</p>

        <p><strong>7. Photo/Video Consent</strong><br />
        I understand that photos and videos may be taken during the event for promotional purposes (social media, website, marketing materials). I may opt in or out of this consent below.</p>

        <p><strong>8. Cancellation &amp; Refund Policy</strong><br />
        Cancellations made at least 24 hours before the event are eligible for a full refund. Cancellations made within 24 hours of the event are non-refundable. No-shows are non-refundable.</p>
      </div>

      {/* Child Info (read-only) */}
      <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-200">
        <p className="text-sm text-purple-700"><strong>Child(ren):</strong> {childNames}</p>
        <p className="text-sm text-purple-700"><strong>Parent/Guardian:</strong> {parentName}</p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-700">Emergency Contact Information *</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input
              type="text"
              value={form.emergency_contact_name}
              onChange={(e) => setForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
              placeholder="Emergency contact name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
            <input
              type="tel"
              value={form.emergency_contact_phone}
              onChange={(e) => setForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
              placeholder="(555) 555-5555"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Relationship *</label>
            <input
              type="text"
              value={form.emergency_contact_relationship}
              onChange={(e) => setForm(prev => ({ ...prev, emergency_contact_relationship: e.target.value }))}
              placeholder="e.g., Spouse, Grandparent"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Authorized Pickup Person(s) *</label>
          <input
            type="text"
            value={form.authorized_pickup}
            onChange={(e) => setForm(prev => ({ ...prev, authorized_pickup: e.target.value }))}
            placeholder="Names of people authorized to pick up your child(ren)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Separate multiple names with commas. Photo ID may be required.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Allergies</label>
            <textarea
              value={form.allergies}
              onChange={(e) => setForm(prev => ({ ...prev, allergies: e.target.value }))}
              placeholder="List any food or environmental allergies..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Medical Conditions</label>
            <textarea
              value={form.medical_conditions}
              onChange={(e) => setForm(prev => ({ ...prev, medical_conditions: e.target.value }))}
              placeholder="Any conditions staff should be aware of..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Photo Consent */}
        <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={form.photo_consent}
            onChange={(e) => setForm(prev => ({ ...prev, photo_consent: e.target.checked }))}
            className="rounded border-gray-300 mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">Photo/Video Consent</p>
            <p className="text-xs text-gray-500">I consent to photos/videos of my child being used for Busy Bee&apos;s promotional materials.</p>
          </div>
        </label>

        {/* Digital Signature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Digital Signature *</label>
          <p className="text-xs text-gray-500 mb-2">Type your full legal name as your electronic signature.</p>
          <input
            type="text"
            value={form.signature}
            onChange={(e) => setForm(prev => ({ ...prev, signature: e.target.value }))}
            placeholder="Type your full legal name"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            style={{ fontStyle: 'italic' }}
          />
        </div>

        {/* Agreement Checkbox */}
        <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="rounded border-gray-300 mt-0.5"
          />
          <p className="text-sm text-purple-800">
            I have read and agree to the After Dark Drop-Off Waiver &amp; Liability Release. I confirm that the information provided is accurate and that I am the parent/legal guardian of the child(ren) listed above.
          </p>
        </label>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!agreed || !form.signature || !form.emergency_contact_name || !form.emergency_contact_phone}
            className="flex-1"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            Sign &amp; Continue to Payment
          </Button>
        </div>
      </div>
    </Card>
  );
}
