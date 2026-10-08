/**
 * The birthday party cancellation & rescheduling policy, in one place.
 *
 * The /parties page and every party confirmation email render it from here,
 * so the notice period can never disagree between them again. It was 7 days
 * until October 2026, when it moved to 14 so a cancelled slot can still be
 * offered to another family. The /info policies list states it in one line
 * from PARTY_NOTICE_DAYS too.
 */

/** Days of notice for a full refund or a free reschedule. */
export const PARTY_NOTICE_DAYS = 14;

export const PARTY_POLICY_TITLE = 'Birthday Party Cancellation & Rescheduling Policy';

export const PARTY_POLICY_INTRO =
  'To prepare properly for your celebration, staff and resources are scheduled in advance.';

export interface PartyPolicySection {
  heading: string;
  paragraphs: string[];
}

export const PARTY_POLICY_SECTIONS: readonly PartyPolicySection[] = [
  {
    heading: 'Notice Period',
    paragraphs: [
      `Cancellations or rescheduling requests must be submitted via email at least ${PARTY_NOTICE_DAYS} days prior to the event.`,
    ],
  },
  {
    heading: `Less Than ${PARTY_NOTICE_DAYS} Days Notice`,
    paragraphs: [
      `Cancellations made within ${PARTY_NOTICE_DAYS} days of the party will result in the 50% deposit being forfeited.`,
    ],
  },
  {
    heading: 'Rescheduling',
    paragraphs: [
      `One complimentary reschedule is allowed if requested at least ${PARTY_NOTICE_DAYS} days prior (subject to availability).`,
      `Rescheduling within the ${PARTY_NOTICE_DAYS}-day window may incur a fee of 25% of the total package cost. This is to cover lost revenue on the birthday slot that otherwise would have been available to another family.`,
    ],
  },
  {
    heading: 'Weather or Emergencies',
    paragraphs: [
      'In cases of extreme weather or documented emergencies, please contact us as soon as possible and we will do our best to accommodate a new date without penalty.',
    ],
  },
];

/** The policy as the plain-text part of an email. */
export function partyPolicyPlainText(): string {
  return [
    PARTY_POLICY_TITLE.toUpperCase(),
    ...PARTY_POLICY_SECTIONS.map((s) => `${s.heading}: ${s.paragraphs.join(' ')}`),
  ].join('\n');
}

/** The policy as an HTML email section, in the calling email's inline styles. */
export function partyPolicyEmailHtml(style: { table: string; padding: string; heading: string; subheading: string; text: string }): string {
  const esc = (value: string) => value.replace(/&/g, '&amp;');
  const sections = PARTY_POLICY_SECTIONS.map((section) => `
                    <p style="${style.subheading}">${esc(section.heading)}</p>
${section.paragraphs.map((paragraph) => `                    <p style="${style.text}">${esc(paragraph)}</p>`).join('\n')}`).join('\n');
  return `<!-- Cancellation & Rescheduling Policy -->
              <table cellpadding="0" cellspacing="0" style="${style.table}">
                <tr>
                  <td style="${style.padding}">
                    <p style="${style.heading}">📋 ${esc(PARTY_POLICY_TITLE)}</p>
                    <p style="${style.text}">${esc(PARTY_POLICY_INTRO)}</p>
${sections}
                  </td>
                </tr>
              </table>`;
}
