'use client';

/**
 * Printable Waiver Page
 * Standalone page at /waiver/print for printing blank waivers to display at the front desk.
 * Auto-triggers print dialog on load.
 */

export default function PrintableWaiverPage() {
  return (
    <>
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        @page {
          margin: 0.5in 0.6in;
        }
      `}</style>

      {/* Print Button - hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-amber-600 transition-colors"
        >
          Print Waiver
        </button>
        <button
          onClick={() => window.history.back()}
          className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
      </div>

      <div
        className="max-w-[700px] mx-auto py-10 px-5 text-gray-900"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-amber-500 pb-4 mb-6">
          <h1 className="text-2xl font-bold">Busy Bees Indoor Play Center</h1>
          <p className="text-base font-semibold text-gray-600 mt-1">Liability Waiver &amp; Release Form</p>
        </div>

        {/* Child Info Fields */}
        <div className="mb-6 space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-sm font-semibold whitespace-nowrap">Child&apos;s Name:</span>
            <span className="flex-1 border-b border-gray-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-sm font-semibold whitespace-nowrap">Date of Birth:</span>
            <span className="flex-1 border-b border-gray-400" />
            <span className="text-sm font-semibold whitespace-nowrap ml-6">Date:</span>
            <span className="w-40 border-b border-gray-400" />
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
          <p className="text-sm leading-relaxed">
            <strong>Busy Bees Indoor Play Center</strong> requires all parents/guardians to read and
            acknowledge the following waiver before their child(ren) may participate in play activities.
            By signing this waiver, you agree to the terms and conditions outlined below.
          </p>
        </div>

        {/* Section 1 */}
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-[15px] font-semibold mb-2">1. Assumption of Risk</h3>
          <p className="text-[13px] leading-relaxed text-gray-700">
            I, the parent or legal guardian of the child(ren) named above, acknowledge that the use of
            indoor play equipment involves inherent risks, including but not limited to bumps, bruises,
            scrapes, and other injuries. I understand that while Busy Bees Indoor Play Center takes
            reasonable precautions to ensure safety, accidents may occur during normal play activities.
          </p>
        </div>

        {/* Section 2 */}
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-[15px] font-semibold mb-2">2. Release of Liability</h3>
          <p className="text-[13px] leading-relaxed text-gray-700">
            I hereby release, waive, and discharge Busy Bees Indoor Play Center, its owners, operators,
            employees, and agents from any and all liability, claims, demands, or causes of action that
            may arise from my child&apos;s participation in play activities at this facility. This release
            includes, but is not limited to, any injuries, damages, or losses sustained by my child while
            using the play equipment or facilities.
          </p>
        </div>

        {/* Section 3 */}
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-[15px] font-semibold mb-2">3. Supervision Responsibility</h3>
          <p className="text-[13px] leading-relaxed text-gray-700">
            I understand and agree that I am solely responsible for supervising my child(ren) at all times
            while at Busy Bees Indoor Play Center. I acknowledge that staff members are not babysitters
            and that the primary responsibility for my child&apos;s safety rests with me as the parent or guardian.
          </p>
        </div>

        {/* Section 4 */}
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-[15px] font-semibold mb-2">4. Photo/Video Release</h3>
          <p className="text-[13px] leading-relaxed text-gray-700">
            I grant Busy Bees Indoor Play Center permission to photograph and/or video record my child(ren)
            for promotional, marketing, and social media purposes. I understand that I may opt out of this
            permission by notifying staff at any time.
          </p>
        </div>

        {/* Acknowledgments */}
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-[15px] font-semibold mb-3">By signing this waiver, I acknowledge that:</h3>
          <ul className="space-y-2 pl-5 list-disc">
            <li className="text-[13px] text-gray-700">My child is in good health and has no medical conditions that would prevent safe participation in play activities</li>
            <li className="text-[13px] text-gray-700">I will ensure my child follows all posted rules and staff instructions</li>
            <li className="text-[13px] text-gray-700">I understand that failure to follow rules may result in removal from the premises without refund</li>
            <li className="text-[13px] text-gray-700">I agree to be financially responsible for any damage caused by my child to the facility or equipment</li>
            <li className="text-[13px] text-gray-700">I have read, understand, and agree to all terms outlined in this waiver</li>
          </ul>
        </div>

        {/* Legal Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong>Legal Notice:</strong> This waiver is binding upon the undersigned, their heirs,
            executors, administrators, and assigns. If any portion of this waiver is held invalid,
            the remaining portions shall continue to be valid and enforceable. This waiver is governed
            by the laws of the State of Massachusetts.
          </p>
        </div>

        {/* Signature Section */}
        <div className="border-t-2 border-gray-300 pt-5 space-y-6">
          <div className="flex items-end gap-2">
            <span className="text-sm font-semibold whitespace-nowrap">Parent/Guardian Signature:</span>
            <span className="flex-1 border-b border-gray-900 min-h-[40px]" />
          </div>
          <div className="flex gap-8">
            <div className="flex items-end gap-2 flex-1">
              <span className="text-sm font-semibold whitespace-nowrap">Printed Name:</span>
              <span className="flex-1 border-b border-gray-900" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-sm font-semibold whitespace-nowrap">Date:</span>
              <span className="w-40 border-b border-gray-900" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
