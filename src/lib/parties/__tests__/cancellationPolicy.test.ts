import { describe, it, expect } from 'vitest';
import {
  PARTY_NOTICE_DAYS,
  PARTY_POLICY_SECTIONS,
  partyPolicyEmailHtml,
  partyPolicyPlainText,
} from '../cancellationPolicy';

describe('party cancellation policy', () => {
  it('requires 14 days notice', () => {
    expect(PARTY_NOTICE_DAYS).toBe(14);
  });

  it('says the same notice period everywhere it names one', () => {
    const all = PARTY_POLICY_SECTIONS.flatMap((s) => [s.heading, ...s.paragraphs]).join(' ');
    const periods = [...all.matchAll(/(\d+)[ -]day/g)].map((m) => Number(m[1]));
    expect(periods.length).toBeGreaterThan(0);
    expect(new Set(periods)).toEqual(new Set([PARTY_NOTICE_DAYS]));
  });

  it('covers notice, late cancellation, rescheduling and weather', () => {
    expect(PARTY_POLICY_SECTIONS.map((s) => s.heading)).toEqual([
      'Notice Period',
      'Less Than 14 Days Notice',
      'Rescheduling',
      'Weather or Emergencies',
    ]);
  });

  it('formats a plain-text block for emails', () => {
    const text = partyPolicyPlainText();
    expect(text.split('\n')[0]).toBe('BIRTHDAY PARTY CANCELLATION & RESCHEDULING POLICY');
    expect(text).toContain(
      'Notice Period: Cancellations or rescheduling requests must be submitted via email at least 14 days prior to the event.'
    );
    expect(text).toContain('50% deposit being forfeited');
    expect(text).toContain('25% of the total package cost');
  });

  it('renders an HTML email section with every heading, 14 days, and escaped ampersands', () => {
    const html = partyPolicyEmailHtml({ table: 'T', padding: 'P', heading: 'H', subheading: 'S', text: 'X' });
    expect(html).toContain('Birthday Party Cancellation &amp; Rescheduling Policy');
    for (const section of PARTY_POLICY_SECTIONS) expect(html).toContain(`<p style="S">${section.heading}</p>`);
    expect(html).toContain('at least 14 days prior to the event.');
    expect(html).not.toMatch(/\b7[ -]day/);
  });
});
