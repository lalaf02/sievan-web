/**
 * How to reach the estate.
 *
 * Taken from the contact page of the estate's existing catalogue site,
 * https://catalog.mauricesievan.com/s/catalog/page/contact — published there for
 * exactly this purpose. Kept in one module because it appears in two places that
 * would otherwise drift: the Research page and the appeal for help identifying
 * the unlabelled Greenberg tape.
 */

export const CONTACT = {
  organisation: 'Maurice Sievan Estate',
  email: 'gabriel.lewisconservation@gmail.com',
  phone: '+1 (469) 422-5028',
  phoneHref: '+14694225028',
  address: ['1107 Putnam Ave.', 'Brooklyn, NY 11221'],
  /** What the estate asks a reproduction request to include. */
  reproductionRequirements: [
    'your name',
    'your institution',
    'the intended use',
    'the relevant work or publication',
  ],
} as const;

/** A pre-addressed mail link. Subject only — never prefill someone's message. */
export function mailtoHref(subject?: string): string {
  return subject
    ? `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CONTACT.email}`;
}
