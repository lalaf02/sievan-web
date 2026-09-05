import type { ReactNode } from 'react';

/*
 * Status, with a shape and a colour. Every index in the admin printed status as a
 * bare grey string with its underscores swapped for spaces — around fourteen
 * distinct status fields, none of them distinguishable at a glance.
 *
 * The tone is derived from the raw value rather than passed in, so a new status
 * string coming out of the database gets a sensible reading without a code
 * change, and an unrecognised one degrades to neutral rather than to nothing.
 */

export type BadgeTone = 'published' | 'review' | 'pending' | 'error' | 'draft' | 'archived';

export function toneOf(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (/(published|live|approved|complete|verified|done)/.test(s)) return 'published';
  if (/(review|check|flag|needs)/.test(s)) return 'review';
  if (/(pending|progress|queued|processing|submitted)/.test(s)) return 'pending';
  if (/(error|failed|reject|invalid|missing)/.test(s)) return 'error';
  if (/(archiv|retired|superseded)/.test(s)) return 'archived';
  return 'draft';
}

/** Turn a stored value such as `in_review` into `In review` for display. */
export function labelOf(status: string): string {
  const words = status.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

export function Badge({
  status, tone, children, className,
}: {
  status: string;
  tone?: BadgeTone;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={className ? `sv-badge ${className}` : 'sv-badge'}
      data-status={tone ?? toneOf(status)}
    >
      {children ?? labelOf(status)}
    </span>
  );
}
