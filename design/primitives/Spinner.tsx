/*
 * A working indicator. Both apps previously swapped the text to "Saving…" or
 * "Searching…" and showed nothing else, so a slow operation and a dead one
 * looked identical.
 *
 * aria-hidden because the surrounding live region announces the state in words;
 * a screen reader should not also hear the decoration.
 */
export function Spinner({ className }: { className?: string }) {
  return <span className={className ? `sv-spinner ${className}` : 'sv-spinner'} aria-hidden="true" />;
}
